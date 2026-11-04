/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Процедурные 3D PBR модели для монтажного стола лаборатории
 * Реалистичные лабораторные стрелочные вольтметры, амперметры, рубильники,
 * реостаты, лампы и приборы высокой детализации.
 */

import * as THREE from 'three';
import {CircuitComponent, SimulationResult} from '../../../../../shared/types.ts';

export interface ComponentMeshHandle {
  group: THREE.Group;
  terminals: Map<string, THREE.Vector3>; // локальные координаты клемм
  interactiveMeshes: THREE.Object3D[]; // кликабельные элементы
  updateState: (comp: CircuitComponent, simResult: SimulationResult | null, timeSec: number) => void;
  dispose: () => void;
}

// Генератор шкалы аналогового стрелочного вольтметра/амперметра высокой четкости (по фото-референсу)
function createAnalogMeterScaleTexture(type: 'voltmeter' | 'ammeter', isLight: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // 1. Благородный винтажный кремово-белый фон шкалы
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Внутренняя закругленная рамка циферблата
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 5;
    ctx.strokeRect(36, 36, 952, 952);

    // Вторая тонкая декоративная рамка
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(46, 46, 932, 932);

    const isVolts = type === 'voltmeter';
    const centerX = 512;
    const centerY = 780;
    const radius = 500;

    // 3. Дуга антипараллаксного зеркала (серебристая зеркальная полоска)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 475, -Math.PI * 0.77, -Math.PI * 0.23);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 14;
    ctx.stroke();

    // 4. Основная дуговая линия шкалы
    ctx.beginPath();
    ctx.arc(centerX, centerY, 510, -Math.PI * 0.77, -Math.PI * 0.23);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 5. Градуировка шкалы (50 делений, как на фото-референсе)
    const totalDivisions = 50;
    const startAngle = -Math.PI * 0.76;
    const endAngle = -Math.PI * 0.24;
    const angleStep = (endAngle - startAngle) / totalDivisions;

    for (let i = 0; i <= totalDivisions; i++) {
      const a = startAngle + i * angleStep;
      const isMajor = i % 10 === 0;
      const isMid = i % 5 === 0 && !isMajor;

      const rOuter = 510;
      const rInner = isMajor ? 440 : isMid ? 465 : 485;

      const x1 = centerX + Math.cos(a) * rOuter;
      const y1 = centerY + Math.sin(a) * rOuter;
      const x2 = centerX + Math.cos(a) * rInner;
      const y2 = centerY + Math.sin(a) * rInner;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = isMajor ? 5 : isMid ? 3 : 2;
      ctx.stroke();

      // Оцифровка шкалы
      if (isMajor) {
        // Верхние числа: 0, 20, 40, 60, 80, 100
        const topVal = ((i / totalDivisions) * 100).toFixed(0);
        const textRadius1 = 405;
        const tx1 = centerX + Math.cos(a) * textRadius1;
        const ty1 = centerY + Math.sin(a) * textRadius1;

        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 36px "Times New Roman", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(topVal, tx1, ty1);

        // Нижние числа:
        // Для амперметра: 0, 0.5, 1.0, 1.5, 2.0 (как на референсе)
        // Для вольтметра: 0, 3, 6, 9, 12, 15 (или 0-100)
        let bottomVal = '';
        if (isVolts) {
          bottomVal = ((i / totalDivisions) * 15).toFixed(0);
        } else {
          bottomVal = ((i / totalDivisions) * 2.0).toFixed(1);
        }

        const textRadius2 = 350;
        const tx2 = centerX + Math.cos(a) * textRadius2;
        const ty2 = centerY + Math.sin(a) * textRadius2;

        ctx.fillStyle = '#27272a';
        ctx.font = 'bold 28px "Times New Roman", Georgia, serif';
        ctx.fillText(bottomVal, tx2, ty2);
      }
    }

    // Вторая дуговая линия под оцифровкой
    ctx.beginPath();
    ctx.arc(centerX, centerY, 385, -Math.PI * 0.76, -Math.PI * 0.24);
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 6. Крупные центральные надписи прибора (в точности как на втором фото)
    ctx.fillStyle = '#18181b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isVolts) {
      ctx.font = 'bold 64px "Times New Roman", Georgia, serif';
      ctx.fillText('VOLTS', centerX, 520);
      ctx.font = 'bold 50px "Times New Roman", Georgia, serif';
      ctx.fillText('(V)', centerX, 580);
    } else {
      ctx.font = 'bold 64px "Times New Roman", Georgia, serif';
      ctx.fillText('AMPERES', centerX, 520);
      ctx.font = 'bold 50px "Times New Roman", Georgia, serif';
      ctx.fillText('(A)', centerX, 580);
    }

    // 7. Технические шильдики по краям циферблата (как на референсе)
    ctx.fillStyle = '#52525b';
    ctx.font = '18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(isVolts ? 'Measure: 0-15 DC' : 'Measure: 0-2.0 DC', 90, 710);
    ctx.fillText('Model: 102A', 90, 736);

    ctx.textAlign = 'right';
    ctx.fillText(isVolts ? 'Resist: 15 kΩ' : 'Resist: 20 Ω', 934, 710);
    ctx.fillText(isVolts ? 'Scale: 1.0 mA' : 'Scale: 4.0 mA', 934, 736);

    // 8. Черная арочная выемка подвижной рамки гальванометра снизу
    ctx.beginPath();
    ctx.arc(centerX, centerY, 130, Math.PI, 0);
    ctx.fillStyle = '#18181b';
    ctx.fill();

    // Латунный винт оси и два монтажных винта крепления механизма
    ctx.beginPath();
    ctx.arc(centerX, centerY - 25, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#d97706';
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Левый и правый винты
    ctx.beginPath();
    ctx.arc(centerX - 80, centerY - 15, 8, 0, Math.PI * 2);
    ctx.arc(centerX + 80, centerY - 15, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Создание реалистичной передней лабораторной клеммы (как на фото-референсе)
function createBindingPost(label: string, colorHex: number): {mesh: THREE.Group; postTopPos: THREE.Vector3} {
  const postGroup = new THREE.Group();

  // Латунная/никелированная шайба-основание на передней панели
  const washerGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24);
  const metalMat = new THREE.MeshStandardMaterial({color: 0xd4d4d8, metalness: 0.9, roughness: 0.2});
  const washer = new THREE.Mesh(washerGeo, metalMat);
  washer.rotation.x = Math.PI / 2;
  postGroup.add(washer);

  // Резьбовой шток
  const threadGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.22, 16);
  const thread = new THREE.Mesh(threadGeo, metalMat);
  thread.rotation.x = Math.PI / 2;
  thread.position.z = 0.1;
  postGroup.add(thread);

  // Рифленая прижимная гайка (Knurled Thumb Nut)
  const nutGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.12, 24);
  const nutMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness: 0.7,
    roughness: 0.35,
  });
  const nut = new THREE.Mesh(nutGeo, nutMat);
  nut.rotation.x = Math.PI / 2;
  nut.position.z = 0.15;
  postGroup.add(nut);

  // Гнездо под 4-мм штекер "банан" по центру
  const holeGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.14, 16);
  const holeMat = new THREE.MeshBasicMaterial({color: 0x09090b});
  const hole = new THREE.Mesh(holeGeo, holeMat);
  hole.rotation.x = Math.PI / 2;
  hole.position.z = 0.2;
  postGroup.add(hole);

  return {
    mesh: postGroup,
    postTopPos: new THREE.Vector3(0, 0, 0.24),
  };
}

export function createComponent3DMesh(
  comp: CircuitComponent,
  isLight: boolean
): ComponentMeshHandle {
  const group = new THREE.Group();
  group.name = `Comp_${comp.id}_${comp.type}`;
  const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  const terminals = new Map<string, THREE.Vector3>();
  const interactiveMeshes: THREE.Object3D[] = [];

  // =========================================================================
  // 1. АУТЕНТИЧНЫЙ ЛАБОРАТОРНЫЙ ВОЛЬТМЕТР / АМПЕРМЕТР (ПО РЕФЕРЕНСУ С ФОТО №2)
  // =========================================================================
  if (comp.type === 'voltmeter' || comp.type === 'ammeter') {
    const isVolts = comp.type === 'voltmeter';

    // Вся сборка прибора имеет легкий эргономичный наклон назад (~10-12 градусов), как на лабораторном столе
    const meterAssembly = new THREE.Group();
    meterAssembly.rotation.x = -0.18; // наклон назад для идеального обзора шкалы
    meterAssembly.position.set(0, 0.05, 0.15);
    group.add(meterAssembly);

    // 1.1. Бакелитовый черный корпус прибора с мягкими скругленными фасками
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0x27272a : 0x141416, // Глубокий матово-полуглянцевый черный бакелит
      roughness: 0.32,
      metalness: 0.12,
    });
    disposables.push(bodyMat);

    // Основной массивный корпус
    const mainBodyGeo = new THREE.BoxGeometry(2.0, 2.2, 0.7);
    disposables.push(mainBodyGeo);
    const mainBody = new THREE.Mesh(mainBodyGeo, bodyMat);
    mainBody.position.set(0, 1.1, 0);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    meterAssembly.add(mainBody);

    // Резиновые ножки на подошве прибора
    const footGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16);
    const footMat = new THREE.MeshStandardMaterial({color: 0x09090b, roughness: 0.9});
    disposables.push(footGeo, footMat);
    const footCoords = [
      [-0.8, -0.02, -0.22],
      [0.8, -0.02, -0.22],
      [-0.8, -0.02, 0.22],
      [0.8, -0.02, 0.22],
    ];
    footCoords.forEach(([fx, fy, fz]) => {
      const f = new THREE.Mesh(footGeo, footMat);
      f.position.set(fx, fy, fz);
      meterAssembly.add(f);
    });

    // 1.2. Рельефная передняя рамка смотрового окна (Front Bezel Rim)
    const bezelMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0x3f3f46 : 0x1f1f23,
      metalness: 0.2,
      roughness: 0.3,
    });
    disposables.push(bezelMat);

    // Внешний контур рамки окна
    const bezelGeo = new THREE.BoxGeometry(1.78, 1.35, 0.08);
    disposables.push(bezelGeo);
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.position.set(0, 1.38, 0.35);
    meterAssembly.add(bezel);

    // 4 хромированных винта со шлицем по углам передней рамки (в точности как на фото)
    const screwHeadGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.02, 16);
    const screwSlotGeo = new THREE.BoxGeometry(0.012, 0.015, 0.07);
    const chromeMat = new THREE.MeshStandardMaterial({color: 0xd4d4d8, metalness: 0.95, roughness: 0.2});
    const darkSlotMat = new THREE.MeshBasicMaterial({color: 0x18181b});
    disposables.push(screwHeadGeo, screwSlotGeo, chromeMat, darkSlotMat);

    const cornerScrewOffsets = [
      [-0.78, 1.95],
      [0.78, 1.95],
      [-0.78, 0.82],
      [0.78, 0.82],
    ];
    cornerScrewOffsets.forEach(([sx, sy]) => {
      const screwGroup = new THREE.Group();
      screwGroup.position.set(sx, sy, 0.38);

      const head = new THREE.Mesh(screwHeadGeo, chromeMat);
      head.rotation.x = Math.PI / 2;
      screwGroup.add(head);

      const slot = new THREE.Mesh(screwSlotGeo, darkSlotMat);
      slot.position.z = 0.01;
      screwGroup.add(slot);

      meterAssembly.add(screwGroup);
    });

    // 1.3. Утопленный циферблат с аутентичной шкалой (Recessed Scale Face)
    const dialPlateGeo = new THREE.PlaneGeometry(1.64, 1.22);
    const dialTex = createAnalogMeterScaleTexture(isVolts ? 'voltmeter' : 'ammeter', isLight);
    disposables.push(dialPlateGeo, dialTex);
    const dialMat = new THREE.MeshStandardMaterial({
      map: dialTex,
      roughness: 0.3,
      metalness: 0.05,
    });
    disposables.push(dialMat);
    const dialPlate = new THREE.Mesh(dialPlateGeo, dialMat);
    dialPlate.position.set(0, 1.38, 0.375); // выдвинут вперед перед передней стенкой
    meterAssembly.add(dialPlate);

    // 1.4. Защитное прозрачное кварцевое стекло (Glass Pane)
    const glassGeo = new THREE.PlaneGeometry(1.66, 1.24);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.05,
      metalness: 0.05,
      transmission: 0.96,
      ior: 1.52,
      depthWrite: false,
    });
    disposables.push(glassGeo, glassMat);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 1.38, 0.405);
    meterAssembly.add(glass);

    // 1.5. ПОДВИЖНАЯ 3D СТРЕЛКА ГАЛЬВАНОМЕТРА (Galvanometer Moving Needle)
    const needlePivot = new THREE.Group();
    // Ось вращения стрелки совпадает с центром нижней арочной выемки циферблата
    needlePivot.position.set(0, 0.88, 0.39);
    meterAssembly.add(needlePivot);

    // Тело стрелки: длинный тонкий черный стержень с переходом в ярко-красный указатель
    const needleBodyGeo = new THREE.CylinderGeometry(0.008, 0.016, 0.6, 8);
    const needleBlackMat = new THREE.MeshStandardMaterial({color: 0x18181b, roughness: 0.3});
    disposables.push(needleBodyGeo, needleBlackMat);
    const needleBody = new THREE.Mesh(needleBodyGeo, needleBlackMat);
    needleBody.position.y = 0.3;
    needlePivot.add(needleBody);

    // Заостренное сигнально-красное перо стрелки (Red Pointer Tip)
    const tipGeo = new THREE.ConeGeometry(0.012, 0.42, 8);
    const needleRedMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.3,
      roughness: 0.2,
    });
    disposables.push(tipGeo, needleRedMat);
    const needleTip = new THREE.Mesh(tipGeo, needleRedMat);
    needleTip.position.y = 0.78;
    needlePivot.add(needleTip);

    // Латунная ступица оси вращения
    const hubGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.035, 24);
    const brassMat = new THREE.MeshStandardMaterial({color: 0xd97706, metalness: 0.9, roughness: 0.25});
    disposables.push(hubGeo, brassMat);
    const hub = new THREE.Mesh(hubGeo, brassMat);
    hub.rotation.x = Math.PI / 2;
    needlePivot.add(hub);

    // Каплевидный противовес внизу оси
    const counterWeightGeo = new THREE.SphereGeometry(0.032, 12, 12);
    disposables.push(counterWeightGeo);
    const counterWeight = new THREE.Mesh(counterWeightGeo, needleBlackMat);
    counterWeight.position.y = -0.12;
    needlePivot.add(counterWeight);

    // Начальный угол отклонения стрелки (нулевая отметка на левом краю)
    needlePivot.rotation.z = 0.74;

    // 1.6. НИЖНИЙ ВЫСТУП: МЕХАНИЧЕСКИЙ КОРРЕКТОР НУЛЯ С ВЕРТИКАЛЬНЫМ РИФЛЕНИЕМ
    const bossGeo = new THREE.BoxGeometry(0.42, 0.44, 0.1);
    disposables.push(bossGeo);
    const boss = new THREE.Mesh(bossGeo, bezelMat);
    boss.position.set(0, 0.42, 0.38);
    meterAssembly.add(boss);

    // Вертикальные канавки рифления на бобышке корректора
    const fluteMat = new THREE.MeshBasicMaterial({color: 0x09090b});
    disposables.push(fluteMat);
    [-0.14, -0.07, 0.07, 0.14].forEach((fx) => {
      const fluteGeo = new THREE.BoxGeometry(0.015, 0.36, 0.02);
      disposables.push(fluteGeo);
      const flute = new THREE.Mesh(fluteGeo, fluteMat);
      flute.position.set(fx, 0.42, 0.432);
      meterAssembly.add(flute);
    });

    // Центральный винт корректора нуля со шлицем
    const zeroScrewGroup = new THREE.Group();
    zeroScrewGroup.position.set(0, 0.42, 0.44);
    const zeroHead = new THREE.Mesh(screwHeadGeo, bezelMat);
    zeroHead.rotation.x = Math.PI / 2;
    zeroScrewGroup.add(zeroHead);
    const zeroSlot = new THREE.Mesh(screwSlotGeo, darkSlotMat);
    zeroSlot.position.z = 0.01;
    zeroScrewGroup.add(zeroSlot);
    meterAssembly.add(zeroScrewGroup);

    // 1.7. ДВЕ ПЕРЕДНИЕ ВИНТОВЫЕ КЛЕММЫ (В точности как на фото-референсе)
    // Левая клемма (Минус / Общий вывод)
    const postLeft = createBindingPost('-', 0x27272a);
    postLeft.mesh.position.set(-0.68, 0.22, 0.36);
    meterAssembly.add(postLeft.mesh);
    // Точка вставки штекера в мировых/локальных координатах прибора
    terminals.set('term_a', new THREE.Vector3(-0.68, 0.22, 0.65));

    // Правая клемма (Плюс / Измерительный вывод)
    const postRight = createBindingPost('+', 0xdc2626);
    postRight.mesh.position.set(0.68, 0.22, 0.36);
    meterAssembly.add(postRight.mesh);
    terminals.set('term_b', new THREE.Vector3(0.68, 0.22, 0.65));

    interactiveMeshes.push(mainBody, glass, postLeft.mesh, postRight.mesh);

    return {
      group,
      terminals,
      interactiveMeshes,
      updateState: (c, sim) => {
        const state = sim?.componentStates[c.id];
        let val = 0;
        if (isVolts) {
          val = Math.abs(state?.voltageDrop || 0);
        } else {
          val = Math.abs(state?.current || 0);
        }

        // Предел шкалы (15В для вольтметра, 2.0А для амперметра)
        const maxVal = isVolts ? 15.0 : 2.0;
        const ratio = Math.max(0, Math.min(1.06, val / maxVal));

        // Поворот стрелки от левого нуля (+0.74 rad) до правого максимума (-0.74 rad)
        const zeroAngle = 0.74;
        const maxAngle = -0.74;
        needlePivot.rotation.z = zeroAngle + ratio * (maxAngle - zeroAngle);
      },
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // =========================================================================
  // 2. БАТАРЕЯ / ИСТОЧНИК ПИТАНИЯ (Heavy-Duty DC Power Cell)
  // =========================================================================
  if (comp.type === 'battery' || comp.type === 'power_source') {
    const baseGeo = new THREE.BoxGeometry(1.6, 0.85, 1.0);
    const baseMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0x1e3a8a : 0x0f172a,
      roughness: 0.35,
      metalness: 0.4,
    });
    disposables.push(baseGeo, baseMat);
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.425;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Верхняя панель
    const topCapGeo = new THREE.BoxGeometry(1.56, 0.1, 0.96);
    const topCapMat = new THREE.MeshStandardMaterial({color: 0x94a3b8, metalness: 0.9, roughness: 0.2});
    disposables.push(topCapGeo, topCapMat);
    const topCap = new THREE.Mesh(topCapGeo, topCapMat);
    topCap.position.y = 0.88;
    group.add(topCap);

    // Клемма POSITIVE (+) с винтовой головкой
    const postPos = createBindingPost('+', 0xdc2626);
    postPos.mesh.position.set(0.52, 0.88, 0);
    group.add(postPos.mesh);
    terminals.set('pos', new THREE.Vector3(0.52, 1.17, 0));

    // Клемма NEGATIVE (-) с черной головкой
    const postNeg = createBindingPost('-', 0x0f172a);
    postNeg.mesh.position.set(-0.52, 0.88, 0);
    group.add(postNeg.mesh);
    terminals.set('neg', new THREE.Vector3(-0.52, 1.17, 0));

    interactiveMeshes.push(baseMesh, postPos.mesh, postNeg.mesh);

    return {
      group,
      terminals,
      interactiveMeshes,
      updateState: () => {},
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // =========================================================================
  // 3. НОЖЕВОЙ РУБИЛЬНИК / КЛЮЧ (Knife Switch)
  // =========================================================================
  if (comp.type === 'switch') {
    const baseGeo = new THREE.BoxGeometry(1.5, 0.16, 0.9);
    const baseMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0xcbd5e1 : 0x1e293b,
      roughness: 0.5,
      metalness: 0.1,
    });
    disposables.push(baseGeo, baseMat);
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.08;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Клеммы зажимов на краях рубильника
    const postA = createBindingPost('A', 0xd97706);
    postA.mesh.position.set(-0.55, 0.16, 0);
    group.add(postA.mesh);
    terminals.set('term_a', new THREE.Vector3(-0.55, 0.45, 0));

    const postB = createBindingPost('B', 0xd97706);
    postB.mesh.position.set(0.55, 0.16, 0);
    group.add(postB.mesh);
    terminals.set('term_b', new THREE.Vector3(0.55, 0.45, 0));

    // Латунные зажимные губки (контакты)
    const brassMat = new THREE.MeshStandardMaterial({color: 0xd97706, metalness: 0.85, roughness: 0.25});
    disposables.push(brassMat);

    const jawGeo = new THREE.BoxGeometry(0.12, 0.26, 0.14);
    disposables.push(jawGeo);
    const jawB = new THREE.Mesh(jawGeo, brassMat);
    jawB.position.set(0.42, 0.28, 0);
    group.add(jawB);

    // Шарнир и нож рубильника
    const hingeGroup = new THREE.Group();
    hingeGroup.position.set(-0.42, 0.28, 0);
    group.add(hingeGroup);

    const bladeGeo = new THREE.BoxGeometry(0.96, 0.08, 0.06);
    disposables.push(bladeGeo);
    const blade = new THREE.Mesh(bladeGeo, brassMat);
    blade.position.set(0.45, 0, 0);
    blade.castShadow = true;
    hingeGroup.add(blade);

    // Рукоятка
    const handleGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.38, 12);
    const handleMat = new THREE.MeshStandardMaterial({color: 0xb91c1c, roughness: 0.3});
    disposables.push(handleGeo, handleMat);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0.98, 0, 0);
    hingeGroup.add(handle);

    interactiveMeshes.push(baseMesh, blade, handle);

    return {
      group,
      terminals,
      interactiveMeshes,
      updateState: (c) => {
        const isOpen = c.state.isOpen !== false;
        hingeGroup.rotation.z = isOpen ? Math.PI / 4 : 0;
      },
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // =========================================================================
  // 4. ЛАМПА НАКАЛИВАНИЯ (Laboratory Light Bulb)
  // =========================================================================
  if (comp.type === 'lamp') {
    const socketGeo = new THREE.CylinderGeometry(0.55, 0.62, 0.38, 24);
    const socketMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0x94a3b8 : 0x334155,
      roughness: 0.4,
      metalness: 0.6,
    });
    disposables.push(socketGeo, socketMat);
    const socket = new THREE.Mesh(socketGeo, socketMat);
    socket.position.y = 0.19;
    socket.castShadow = true;
    socket.receiveShadow = true;
    group.add(socket);

    // Винтовые клеммы для проводов
    const postA = createBindingPost('A', 0xd97706);
    postA.mesh.position.set(-0.52, 0.19, 0);
    group.add(postA.mesh);
    terminals.set('term_a', new THREE.Vector3(-0.52, 0.48, 0));

    const postB = createBindingPost('B', 0xd97706);
    postB.mesh.position.set(0.52, 0.19, 0);
    group.add(postB.mesh);
    terminals.set('term_b', new THREE.Vector3(0.52, 0.48, 0));

    // Стеклянная колба лампы
    const bulbGeo = new THREE.SphereGeometry(0.48, 24, 24);
    const bulbMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.08,
      transmission: 0.92,
      ior: 1.5,
    });
    disposables.push(bulbGeo, bulbMat);
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = 0.72;
    group.add(bulb);

    // Вольфрамовая спираль
    const filamentGeo = new THREE.TorusGeometry(0.14, 0.022, 8, 16, Math.PI * 1.8);
    const filamentMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.3,
    });
    disposables.push(filamentGeo, filamentMat);
    const filament = new THREE.Mesh(filamentGeo, filamentMat);
    filament.rotation.x = Math.PI / 2;
    filament.position.y = 0.72;
    group.add(filament);

    const lampLight = new THREE.PointLight(0xf59e0b, 0, 7);
    lampLight.position.y = 0.72;
    lampLight.castShadow = true;
    group.add(lampLight);

    interactiveMeshes.push(socket, bulb);

    return {
      group,
      terminals,
      interactiveMeshes,
      updateState: (c, sim) => {
        const state = sim?.componentStates[c.id];
        const power = state?.power || 0;
        const brightness = Math.min(1.2, Math.max(0, power / 1.5));

        if (brightness > 0.05) {
          filamentMat.emissive.setHex(0xf59e0b);
          filamentMat.emissiveIntensity = brightness * 3.5;
          lampLight.intensity = brightness * 3.2;
        } else {
          filamentMat.emissive.setHex(0x000000);
          filamentMat.emissiveIntensity = 0;
          lampLight.intensity = 0;
        }
      },
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // =========================================================================
  // 5. РЕОСТАТ ПОЛЗУНКОВЫЙ (Wire-wound Slider Rheostat)
  // =========================================================================
  if (comp.type === 'rheostat') {
    const baseGeo = new THREE.BoxGeometry(2.2, 0.14, 0.75);
    const baseMat = new THREE.MeshStandardMaterial({color: isLight ? 0x94a3b8 : 0x1e293b, metalness: 0.3});
    disposables.push(baseGeo, baseMat);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.07;
    group.add(base);

    // Нихромовая обмотка
    const tubeGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.8, 24);
    const coilMat = new THREE.MeshStandardMaterial({color: 0x78716c, roughness: 0.6, metalness: 0.4});
    disposables.push(tubeGeo, coilMat);
    const tube = new THREE.Mesh(tubeGeo, coilMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.y = 0.32;
    group.add(tube);

    // Металлическая направляющая
    const rodGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.9, 12);
    const rodMat = new THREE.MeshStandardMaterial({color: 0xd1d5db, metalness: 0.9, roughness: 0.2});
    disposables.push(rodGeo, rodMat);
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.y = 0.58;
    group.add(rod);

    // Подвижный ползунок
    const sliderGroup = new THREE.Group();
    sliderGroup.position.set(0, 0.58, 0);
    group.add(sliderGroup);

    const sliderBlockGeo = new THREE.BoxGeometry(0.22, 0.25, 0.26);
    const sliderBlockMat = new THREE.MeshStandardMaterial({color: 0xd97706, roughness: 0.3, metalness: 0.7});
    disposables.push(sliderBlockGeo, sliderBlockMat);
    const sliderBlock = new THREE.Mesh(sliderBlockGeo, sliderBlockMat);
    sliderGroup.add(sliderBlock);

    // Клеммы реостата
    const postA = createBindingPost('A', 0xd97706);
    postA.mesh.position.set(-0.95, 0.14, 0);
    group.add(postA.mesh);
    terminals.set('term_a', new THREE.Vector3(-0.95, 0.43, 0));

    const postB = createBindingPost('B', 0xd97706);
    postB.mesh.position.set(0.95, 0.14, 0);
    group.add(postB.mesh);
    terminals.set('term_b', new THREE.Vector3(0.95, 0.43, 0));

    interactiveMeshes.push(sliderBlock, base);

    return {
      group,
      terminals,
      interactiveMeshes,
      updateState: (c) => {
        const val = c.values.resistance || 25;
        const ratio = Math.max(0, Math.min(1, (val - 1) / 99));
        sliderGroup.position.x = -0.75 + ratio * 1.5;
      },
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // =========================================================================
  // 6. РЕЗИСТОР (Fixed Ceramic Resistor)
  // =========================================================================
  if (comp.type === 'resistor') {
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.95, 24);
    const bodyMat = new THREE.MeshStandardMaterial({color: 0xe0e7ff, roughness: 0.4});
    disposables.push(bodyGeo, bodyMat);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.22;
    group.add(body);

    // Полоски
    const bandGeo = new THREE.CylinderGeometry(0.185, 0.185, 0.08, 24);
    const bMat = new THREE.MeshStandardMaterial({color: 0x92400e});
    disposables.push(bandGeo, bMat);
    const b1 = new THREE.Mesh(bandGeo, bMat);
    b1.rotation.z = Math.PI / 2;
    b1.position.set(-0.25, 0.22, 0);
    group.add(b1);

    // Клеммы
    const postA = createBindingPost('1', 0xd97706);
    postA.mesh.position.set(-0.7, 0, 0);
    group.add(postA.mesh);
    terminals.set('term_a', new THREE.Vector3(-0.7, 0.29, 0));

    const postB = createBindingPost('2', 0xd97706);
    postB.mesh.position.set(0.7, 0, 0);
    group.add(postB.mesh);
    terminals.set('term_b', new THREE.Vector3(0.7, 0.29, 0));

    interactiveMeshes.push(body);

    return {
      group,
      terminals,
      interactiveMeshes,
      updateState: () => {},
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // =========================================================================
  // 7. КОНДЕНСАТОР (Electrolytic Capacitor)
  // =========================================================================
  if (comp.type === 'capacitor') {
    const canGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.85, 24);
    const canMat = new THREE.MeshStandardMaterial({color: 0x0284c7, metalness: 0.6, roughness: 0.3});
    disposables.push(canGeo, canMat);
    const can = new THREE.Mesh(canGeo, canMat);
    can.position.y = 0.425;
    group.add(can);

    const postA = createBindingPost('+', 0xdc2626);
    postA.mesh.position.set(-0.4, 0, 0);
    group.add(postA.mesh);
    terminals.set('term_a', new THREE.Vector3(-0.4, 0.29, 0));

    const postB = createBindingPost('-', 0x0f172a);
    postB.mesh.position.set(0.4, 0, 0);
    group.add(postB.mesh);
    terminals.set('term_b', new THREE.Vector3(0.4, 0.29, 0));

    interactiveMeshes.push(can);

    return {
      group,
      terminals,
      interactiveMeshes,
      updateState: () => {},
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // =========================================================================
  // 8. ДИОД (Semiconductor Diode)
  // =========================================================================
  if (comp.type === 'diode') {
    const diodeGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.65, 24);
    const diodeMat = new THREE.MeshStandardMaterial({color: 0x1e293b, roughness: 0.3});
    disposables.push(diodeGeo, diodeMat);
    const diodeMesh = new THREE.Mesh(diodeGeo, diodeMat);
    diodeMesh.rotation.z = Math.PI / 2;
    diodeMesh.position.y = 0.2;
    group.add(diodeMesh);

    // Серебристая полоса катода
    const cathGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.1, 24);
    const cathMat = new THREE.MeshStandardMaterial({color: 0xd1d5db, metalness: 0.8});
    disposables.push(cathGeo, cathMat);
    const cath = new THREE.Mesh(cathGeo, cathMat);
    cath.rotation.z = Math.PI / 2;
    cath.position.set(0.2, 0.2, 0);
    group.add(cath);

    const postA = createBindingPost('A', 0xdc2626);
    postA.mesh.position.set(-0.55, 0, 0);
    group.add(postA.mesh);
    terminals.set('term_a', new THREE.Vector3(-0.55, 0.29, 0));

    const postB = createBindingPost('K', 0x0f172a);
    postB.mesh.position.set(0.55, 0, 0);
    group.add(postB.mesh);
    terminals.set('term_b', new THREE.Vector3(0.55, 0.29, 0));

    interactiveMeshes.push(diodeMesh);

    return {
      group,
      terminals,
      interactiveMeshes,
      updateState: () => {},
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // =========================================================================
  // 9. ОПТИКА (Laser Source, Lenses, Screen)
  // =========================================================================
  if (comp.type === 'laser_source') {
    const tubeGeo = new THREE.CylinderGeometry(0.14, 0.16, 1.2, 24);
    const tubeMat = new THREE.MeshStandardMaterial({color: 0x1e293b, metalness: 0.8, roughness: 0.2});
    disposables.push(tubeGeo, tubeMat);
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.y = 0.45;
    group.add(tube);

    const standGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 12);
    const standMat = new THREE.MeshStandardMaterial({color: 0x64748b, metalness: 0.6});
    disposables.push(standGeo, standMat);
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 0.2;
    group.add(stand);

    const beamOutPos = new THREE.Vector3(0.65, 0.45, 0);
    terminals.set('beam_out', beamOutPos);

    const beamGeo = new THREE.CylinderGeometry(0.02, 0.02, 4.0, 8);
    const beamMat = new THREE.MeshBasicMaterial({color: 0xef4444, transparent: true, opacity: 0.85});
    disposables.push(beamGeo, beamMat);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.z = -Math.PI / 2;
    beam.position.set(2.65, 0.45, 0);
    group.add(beam);

    interactiveMeshes.push(tube);

    return {
      group,
      terminals,
      interactiveMeshes,
      updateState: () => {},
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  if (comp.type === 'convex_lens' || comp.type === 'concave_lens') {
    const lensBodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 32);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.05,
      transmission: 0.95,
      ior: 1.52,
    });
    disposables.push(lensBodyGeo, glassMat);
    const lensBody = new THREE.Mesh(lensBodyGeo, glassMat);
    lensBody.position.y = 0.55;
    group.add(lensBody);

    const rimGeo = new THREE.TorusGeometry(0.51, 0.05, 12, 32);
    const brassMat = new THREE.MeshStandardMaterial({color: 0xd97706, metalness: 0.8});
    disposables.push(rimGeo, brassMat);
    const rim = new THREE.Mesh(rimGeo, brassMat);
    rim.position.y = 0.55;
    group.add(rim);

    terminals.set('surface_in', new THREE.Vector3(-0.55, 0.55, 0));
    terminals.set('surface_out', new THREE.Vector3(0.55, 0.55, 0));

    interactiveMeshes.push(lensBody, rim);

    return {
      group,
      terminals,
      interactiveMeshes,
      updateState: () => {},
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }

  // =========================================================================
  // 10. УНИВЕРСАЛЬНЫЙ МОДЕЛИРУЕМЫЙ МОДУЛЬ
  // =========================================================================
  const defaultGeo = new THREE.BoxGeometry(1.2, 0.35, 0.8);
  const defaultMat = new THREE.MeshStandardMaterial({
    color: isLight ? 0x94a3b8 : 0x1e293b,
    roughness: 0.4,
  });
  disposables.push(defaultGeo, defaultMat);
  const defaultMesh = new THREE.Mesh(defaultGeo, defaultMat);
  defaultMesh.position.y = 0.175;
  group.add(defaultMesh);

  const postA = createBindingPost('1', 0xdc2626);
  postA.mesh.position.set(-0.45, 0.175, 0);
  group.add(postA.mesh);
  terminals.set('term_a', new THREE.Vector3(-0.45, 0.46, 0));

  const postB = createBindingPost('2', 0x0f172a);
  postB.mesh.position.set(0.45, 0.175, 0);
  group.add(postB.mesh);
  terminals.set('term_b', new THREE.Vector3(0.45, 0.46, 0));

  interactiveMeshes.push(defaultMesh);

  return {
    group,
    terminals,
    interactiveMeshes,
    updateState: () => {},
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
