/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Процедурные 3D PBR модели лабораторных приборов
 * Высокодетализированный мультиметр Fluke 87V со щупами, двухканальный блок питания
 * с силовыми кабелями, pH-метр с BNC-электродом и измерительные приборы.
 */

import * as THREE from 'three';
import {ActiveInstrument, Theme3DConfig} from '../types.ts';

export interface InstrumentModelHandles {
  group: THREE.Group;
  updateInstruments: (instruments: ActiveInstrument[]) => void;
  dispose: () => void;
}

// Генератор текстуры LCD дисплея мультиметра Fluke 87V
function createFlukeLcdTexture(primaryVal: string, mode: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Подсветка жидкокристаллического дисплея (светло-серо-зеленый фон)
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, 512, 256);

    // Рамка дисплея
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    // Служебные индикаторы вверху
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('DC  AUTO  TRUE RMS', 30, 48);
    ctx.fillText('HOLD', 400, 48);

    // Основное цифровое табло 4 1/2 разряда
    ctx.font = 'bold 92px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(primaryVal, 420, 150);

    // Единицы измерения
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(mode, 430, 150);

    // Аналоговая линейная шкала BarGraph внизу дисплея (32 сегмента)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(30, 185, 452, 14);

    const activeBars = 22;
    ctx.fillStyle = '#0284c7';
    for (let b = 0; b < activeBars; b++) {
      ctx.fillRect(32 + b * 14, 187, 10, 10);
    }

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('0 . . . . 10 . . . . 20 . . . . 30 . . . . 40', 30, 225);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Генератор текстуры лицевой панели двухканального блока питания (LED 7-сегментные индикаторы)
function createPowerSupplyPanelTexture(voltageStr: string, currentStr: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Матовая порошковая панель
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 384);

    // Заголовок
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('OZMO LAB • PS-3005D', 25, 45);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.fillText('PRECISION REGULATED DC POWER SUPPLY 0-30V 0-5A', 25, 70);

    // Окошко дисплея напряжения (Красный LED)
    ctx.fillStyle = '#020617';
    ctx.fillRect(25, 95, 220, 110);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(25, 95, 220, 110);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 56px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(voltageStr, 205, 175);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('V', 235, 175);

    // Окошко дисплея тока (Зеленый LED)
    ctx.fillStyle = '#020617';
    ctx.fillRect(265, 95, 220, 110);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(265, 95, 220, 110);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 56px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(currentStr, 445, 175);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('A', 475, 175);

    // Индикаторы режимов C.V. (Constant Voltage) и C.C. (Constant Current)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(80, 240, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('C.V.', 100, 246);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(320, 240, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('C.C.', 340, 246);

    // Маркировка регуляторов
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px monospace';
    ctx.fillText('VOLTAGE (COARSE / FINE)', 25, 290);
    ctx.fillText('CURRENT (COARSE / FINE)', 265, 290);

    // Маркировка клемм внизу
    ctx.fillStyle = '#ef4444';
    ctx.fillText('+ OUTPUT', 80, 360);
    ctx.fillStyle = '#10b981';
    ctx.fillText('GND', 240, 360);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('- OUTPUT', 380, 360);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createInstrumentBench(isLight: boolean, _config?: Theme3DConfig): InstrumentModelHandles {
  const group = new THREE.Group();
  group.name = 'InstrumentWorkbenchRack';

  const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  const instrumentMeshes = new Map<string, THREE.Group>();

  // Слоты размещения приборов по периметру стола
  const slotPositions: [number, number, number][] = [
    [-3.8, 0.05, 1.4],
    [3.8, 0.05, 1.4],
    [-4.2, 0.05, -1.2],
    [4.2, 0.05, -1.2],
    [-2.2, 0.05, 2.4],
    [2.2, 0.05, 2.4],
  ];

  function createInstrumentNode(inst: ActiveInstrument): THREE.Group {
    const node = new THREE.Group();
    node.name = `Instrument_${inst.id}`;

    const pos = slotPositions[inst.positionIndex % slotPositions.length];
    node.position.set(pos[0], pos[1], pos[2]);

    // =======================================================================
    // 1. МУЛЬТИМЕТР FLUKE 87V С ПОДКЛЮЧЕННЫМИ ИЗМЕРИТЕЛЬНЫМИ ЩУПАМИ
    // =======================================================================
    if (inst.type === 'multimeter') {
      const meterGroup = new THREE.Group();
      node.add(meterGroup);

      // Ярко-желтый защитный резиновый бампер (Holster)
      const holsterGeo = new THREE.BoxGeometry(1.05, 0.38, 1.65);
      const holsterMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // Фирменный желтый цвет Fluke
        roughness: 0.45,
        metalness: 0.1,
      });
      disposables.push(holsterGeo, holsterMat);
      const holster = new THREE.Mesh(holsterGeo, holsterMat);
      holster.position.y = 0.19;
      holster.castShadow = true;
      meterGroup.add(holster);

      // Темно-серый внутренний корпус прибора
      const faceGeo = new THREE.BoxGeometry(0.92, 0.4, 1.52);
      const faceMat = new THREE.MeshStandardMaterial({color: 0x1e293b, roughness: 0.35});
      disposables.push(faceGeo, faceMat);
      const face = new THREE.Mesh(faceGeo, faceMat);
      face.position.y = 0.2;
      meterGroup.add(face);

      // ЖК-экран
      const screenGeo = new THREE.PlaneGeometry(0.78, 0.45);
      const screenTex = createFlukeLcdTexture(inst.primaryValue, inst.unit);
      disposables.push(screenGeo, screenTex);
      const screenMat = new THREE.MeshBasicMaterial({map: screenTex});
      disposables.push(screenMat);
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.rotation.x = -Math.PI / 2.35;
      screen.position.set(0, 0.41, -0.32);
      meterGroup.add(screen);
      node.userData.screenMat = screenMat;

      // Круглый поворотный переключатель диапазонов (галетник)
      const dialGeo = new THREE.CylinderGeometry(0.24, 0.25, 0.1, 24);
      const dialMat = new THREE.MeshStandardMaterial({color: 0x0f172a, roughness: 0.3, metalness: 0.5});
      disposables.push(dialGeo, dialMat);
      const dial = new THREE.Mesh(dialGeo, dialMat);
      dial.rotation.x = -Math.PI / 2.35;
      dial.position.set(0, 0.32, 0.15);
      meterGroup.add(dial);

      // Указатель на переключателе
      const pointerGeo = new THREE.BoxGeometry(0.04, 0.03, 0.22);
      const pointerMat = new THREE.MeshBasicMaterial({color: 0xffffff});
      disposables.push(pointerGeo, pointerMat);
      const pointer = new THREE.Mesh(pointerGeo, pointerMat);
      pointer.position.set(0, 0.06, 0);
      dial.add(pointer);

      // 4 гнезда под банановые штекеры (10A, mA, COM, V/Ω)
      const jackMat = new THREE.MeshStandardMaterial({color: 0x0f172a, metalness: 0.8});
      const jackGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.06, 12);
      disposables.push(jackMat, jackGeo);

      const jackX = [-0.3, -0.1, 0.1, 0.3];
      jackX.forEach((jx) => {
        const j = new THREE.Mesh(jackGeo, jackMat);
        j.rotation.x = -Math.PI / 2.35;
        j.position.set(jx, 0.26, 0.55);
        meterGroup.add(j);
      });

      // ГИБКИЕ ИЗМЕРИТЕЛЬНЫЕ КАБЕЛИ И ЩУПЫ (TEST LEADS)
      // Красный кабель из гнезда V/Ω (+0.3, 0.26, 0.55) -> тянется к схеме
      const redProbeStart = new THREE.Vector3(0.3, 0.26, 0.55);
      const redProbeEnd = new THREE.Vector3(1.4, 0.15, -0.8);
      const redCurve = new THREE.CatmullRomCurve3([
        redProbeStart,
        new THREE.Vector3(0.3, 0.4, 0.9),
        new THREE.Vector3(0.8, 0.08, 0.2),
        redProbeEnd,
      ]);
      const redLeadGeo = new THREE.TubeGeometry(redCurve, 24, 0.022, 8, false);
      const redLeadMat = new THREE.MeshStandardMaterial({color: 0xef4444, roughness: 0.35});
      disposables.push(redLeadGeo, redLeadMat);
      const redLead = new THREE.Mesh(redLeadGeo, redLeadMat);
      meterGroup.add(redLead);

      // Черный кабель из гнезда COM (+0.1, 0.26, 0.55) -> тянется к схеме
      const blackProbeStart = new THREE.Vector3(0.1, 0.26, 0.55);
      const blackProbeEnd = new THREE.Vector3(0.9, 0.15, -0.8);
      const blackCurve = new THREE.CatmullRomCurve3([
        blackProbeStart,
        new THREE.Vector3(0.1, 0.4, 0.9),
        new THREE.Vector3(0.5, 0.08, 0.3),
        blackProbeEnd,
      ]);
      const blackLeadGeo = new THREE.TubeGeometry(blackCurve, 24, 0.022, 8, false);
      const blackLeadMat = new THREE.MeshStandardMaterial({color: 0x1e293b, roughness: 0.35});
      disposables.push(blackLeadGeo, blackLeadMat);
      const blackLead = new THREE.Mesh(blackLeadGeo, blackLeadMat);
      meterGroup.add(blackLead);

      // Сами пластиковые щупы с золотыми иглами на концах
      const probeBodyGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.45, 12);
      const needlePinGeo = new THREE.CylinderGeometry(0.012, 0.005, 0.15, 8);
      const goldMat = new THREE.MeshStandardMaterial({color: 0xd97706, metalness: 0.95});
      disposables.push(probeBodyGeo, needlePinGeo, goldMat);

      const probeRed = new THREE.Mesh(probeBodyGeo, redLeadMat);
      probeRed.position.copy(redProbeEnd);
      probeRed.rotation.z = Math.PI / 4;
      const needleRed = new THREE.Mesh(needlePinGeo, goldMat);
      needleRed.position.y = 0.28;
      probeRed.add(needleRed);
      meterGroup.add(probeRed);

      const probeBlack = new THREE.Mesh(probeBodyGeo, blackLeadMat);
      probeBlack.position.copy(blackProbeEnd);
      probeBlack.rotation.z = Math.PI / 4;
      const needleBlack = new THREE.Mesh(needlePinGeo, goldMat);
      needleBlack.position.y = 0.28;
      probeBlack.add(needleBlack);
      meterGroup.add(probeBlack);
    }

    // =======================================================================
    // 2. ДВУХКАНАЛЬНЫЙ ЛАБОРАТОРНЫЙ БЛОК ПИТАНИЯ DC 0-30V С КАБЕЛЯМИ
    // =======================================================================
    else if (inst.type === 'power_supply') {
      const psGroup = new THREE.Group();
      node.add(psGroup);

      // Стальной корпус прибора
      const bodyGeo = new THREE.BoxGeometry(1.6, 1.2, 1.5);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isLight ? 0xe2e8f0 : 0x1e293b,
        metalness: 0.4,
        roughness: 0.35,
      });
      disposables.push(bodyGeo, bodyMat);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.6;
      body.castShadow = true;
      psGroup.add(body);

      // Ручка для переноски на верхней крышке
      const handleGeo = new THREE.TorusGeometry(0.22, 0.035, 12, 24, Math.PI);
      const handleMat = new THREE.MeshStandardMaterial({color: 0x475569, metalness: 0.8});
      disposables.push(handleGeo, handleMat);
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(0, 1.22, 0);
      psGroup.add(handle);

      // Лицевая панель с цифровой индикацией
      const panelGeo = new THREE.PlaneGeometry(1.5, 1.1);
      const panelTex = createPowerSupplyPanelTexture(inst.primaryValue, inst.secondaryValue);
      disposables.push(panelGeo, panelTex);
      const panelMat = new THREE.MeshBasicMaterial({map: panelTex});
      disposables.push(panelMat);
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(0, 0.6, 0.76);
      psGroup.add(panel);
      node.userData.screenMat = panelMat;

      // 4 вращающиеся ручки регулировки (напряжение и ток)
      const knobGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.1, 16);
      const knobMat = new THREE.MeshStandardMaterial({color: 0x64748b, metalness: 0.8, roughness: 0.2});
      disposables.push(knobGeo, knobMat);

      const knobCoords = [
        [-0.45, 0.45, 0.82],
        [-0.15, 0.45, 0.82],
        [0.15, 0.45, 0.82],
        [0.45, 0.45, 0.82],
      ];
      knobCoords.forEach((kc) => {
        const k = new THREE.Mesh(knobGeo, knobMat);
        k.rotation.x = Math.PI / 2;
        k.position.set(kc[0], kc[1], kc[2]);
        psGroup.add(k);
      });

      // 3 выходные клеммы (+ Красная, GND Зеленая, - Синяя/Черная)
      const postGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.18, 16);
      const pMatRed = new THREE.MeshStandardMaterial({color: 0xef4444});
      const pMatGrn = new THREE.MeshStandardMaterial({color: 0x10b981});
      const pMatBlk = new THREE.MeshStandardMaterial({color: 0x0284c7});
      disposables.push(postGeo, pMatRed, pMatGrn, pMatBlk);

      const pPos = new THREE.Mesh(postGeo, pMatRed);
      pPos.rotation.x = Math.PI / 2;
      pPos.position.set(-0.45, 0.2, 0.82);
      psGroup.add(pPos);

      const pGnd = new THREE.Mesh(postGeo, pMatGrn);
      pGnd.rotation.x = Math.PI / 2;
      pGnd.position.set(0, 0.2, 0.82);
      psGroup.add(pGnd);

      const pNeg = new THREE.Mesh(postGeo, pMatBlk);
      pNeg.rotation.x = Math.PI / 2;
      pNeg.position.set(0.45, 0.2, 0.82);
      psGroup.add(pNeg);

      // СИЛОВЫЕ КАБЕЛИ ПИТАНИЯ С ШТЕКЕРАМИ, ИДУЩИЕ К СХЕМЕ
      const cableRedStart = new THREE.Vector3(-0.45, 0.2, 0.9);
      const cableRedEnd = new THREE.Vector3(-1.8, 0.1, -0.6);
      const redCurve = new THREE.CatmullRomCurve3([
        cableRedStart,
        new THREE.Vector3(-0.45, 0.2, 1.4),
        new THREE.Vector3(-1.2, 0.08, 0.4),
        cableRedEnd,
      ]);
      const cRedGeo = new THREE.TubeGeometry(redCurve, 24, 0.035, 8, false);
      const cRedMat = new THREE.MeshStandardMaterial({color: 0xef4444, roughness: 0.35});
      disposables.push(cRedGeo, cRedMat);
      const cRed = new THREE.Mesh(cRedGeo, cRedMat);
      psGroup.add(cRed);

      const cableNegStart = new THREE.Vector3(0.45, 0.2, 0.9);
      const cableNegEnd = new THREE.Vector3(-1.2, 0.1, -0.6);
      const negCurve = new THREE.CatmullRomCurve3([
        cableNegStart,
        new THREE.Vector3(0.45, 0.2, 1.4),
        new THREE.Vector3(-0.3, 0.08, 0.4),
        cableNegEnd,
      ]);
      const cNegGeo = new THREE.TubeGeometry(negCurve, 24, 0.035, 8, false);
      const cNegMat = new THREE.MeshStandardMaterial({color: 0x1e293b, roughness: 0.35});
      disposables.push(cNegGeo, cNegMat);
      const cNeg = new THREE.Mesh(cNegGeo, cNegMat);
      psGroup.add(cNeg);
    }

    // =======================================================================
    // 3. НАСТОЛЬНЫЙ ЛАБОРАТОРНЫЙ pH-МЕТР С ШТАТИВОМ И СТАКАНЧИКОМ
    // =======================================================================
    else if (inst.type === 'ph_meter') {
      const phGroup = new THREE.Group();
      node.add(phGroup);

      // Корпус прибора со скошенной клавиатурной панелью
      const baseGeo = new THREE.BoxGeometry(1.2, 0.24, 1.4);
      const baseMat = new THREE.MeshStandardMaterial({
        color: isLight ? 0xf1f5f9 : 0x1e293b,
        roughness: 0.3,
        metalness: 0.1,
      });
      disposables.push(baseGeo, baseMat);
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.12;
      phGroup.add(base);

      // Наклонная панель с дисплеем и сенсорными кнопками
      const screenGeo = new THREE.PlaneGeometry(0.85, 0.48);
      const screenTex = createFlukeLcdTexture(inst.primaryValue, inst.unit);
      disposables.push(screenGeo, screenTex);
      const screenMat = new THREE.MeshBasicMaterial({map: screenTex});
      disposables.push(screenMat);
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.rotation.x = -Math.PI / 2.5;
      screen.position.set(0, 0.25, -0.1);
      phGroup.add(screen);
      node.userData.screenMat = screenMat;

      // ШТАТИВ ЭЛЕКТРОДА (Stainless steel articulated stand)
      const standBaseGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.06, 24);
      const standMetalMat = new THREE.MeshStandardMaterial({color: 0x94a3b8, metalness: 0.9, roughness: 0.15});
      disposables.push(standBaseGeo, standMetalMat);
      const standBase = new THREE.Mesh(standBaseGeo, standMetalMat);
      standBase.position.set(0.9, 0.03, -0.2);
      phGroup.add(standBase);

      const verticalRodGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.3, 16);
      disposables.push(verticalRodGeo);
      const verticalRod = new THREE.Mesh(verticalRodGeo, standMetalMat);
      verticalRod.position.set(0.9, 0.68, -0.2);
      phGroup.add(verticalRod);

      const armRodGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.65, 12);
      disposables.push(armRodGeo);
      const armRod = new THREE.Mesh(armRodGeo, standMetalMat);
      armRod.rotation.z = Math.PI / 2;
      armRod.position.set(0.65, 0.95, -0.2);
      phGroup.add(armRod);

      // Стеклянный химический стаканчик с исследуемым раствором
      const beakerGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.6, 24, 1, true);
      const beakerGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        roughness: 0.05,
        transmission: 0.9,
        ior: 1.5,
      });
      disposables.push(beakerGeo, beakerGlassMat);
      const beaker = new THREE.Mesh(beakerGeo, beakerGlassMat);
      beaker.position.set(0.4, 0.3, -0.2);
      phGroup.add(beaker);

      // Жидкость в стакане
      const liquidGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.45, 24);
      const liquidMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.7,
        roughness: 0.1,
      });
      disposables.push(liquidGeo, liquidMat);
      const liquid = new THREE.Mesh(liquidGeo, liquidMat);
      liquid.position.set(0.4, 0.23, -0.2);
      phGroup.add(liquid);

      // Комбинированный стеклянный pH-электрод
      const electrodeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.85, 16);
      const elecGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
      });
      disposables.push(electrodeGeo, elecGlassMat);
      const electrode = new THREE.Mesh(electrodeGeo, elecGlassMat);
      electrode.position.set(0.4, 0.55, -0.2);
      phGroup.add(electrode);

      // BNC кабель от задней стенки прибора к головке электрода
      const bncCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.15, -0.7),
        new THREE.Vector3(0.3, 0.4, -0.8),
        new THREE.Vector3(0.5, 0.98, -0.4),
        new THREE.Vector3(0.4, 0.98, -0.2),
      ]);
      const bncGeo = new THREE.TubeGeometry(bncCurve, 24, 0.024, 8, false);
      const bncMat = new THREE.MeshStandardMaterial({color: 0x334155, roughness: 0.4});
      disposables.push(bncGeo, bncMat);
      const bnc = new THREE.Mesh(bncGeo, bncMat);
      phGroup.add(bnc);
    }

    // =======================================================================
    // 4. ПРЕЦИЗИОННЫЙ ТЕРМОМЕТР Pt100 С ПОГРУЖНЫМ ДАТЧИКОМ
    // =======================================================================
    else if (inst.type === 'thermometer') {
      const termGroup = new THREE.Group();
      node.add(termGroup);

      // Портативный измерительный блок
      const bodyGeo = new THREE.BoxGeometry(0.9, 0.32, 1.4);
      const bodyMat = new THREE.MeshStandardMaterial({color: 0x0284c7, roughness: 0.35});
      disposables.push(bodyGeo, bodyMat);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.16;
      termGroup.add(body);

      const screenGeo = new THREE.PlaneGeometry(0.7, 0.42);
      const screenTex = createFlukeLcdTexture(inst.primaryValue, inst.unit);
      disposables.push(screenGeo, screenTex);
      const screenMat = new THREE.MeshBasicMaterial({map: screenTex});
      disposables.push(screenMat);
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.rotation.x = -Math.PI / 2.3;
      screen.position.set(0, 0.33, -0.15);
      termGroup.add(screen);
      node.userData.screenMat = screenMat;

      // Гибкий спиральный провод к зонду
      const cableCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.2, -0.7),
        new THREE.Vector3(0.3, 0.3, -0.9),
        new THREE.Vector3(0.8, 0.1, -0.6),
        new THREE.Vector3(1.1, 0.15, -0.2),
      ]);
      const cableGeo = new THREE.TubeGeometry(cableCurve, 24, 0.022, 8, false);
      const cableMat = new THREE.MeshStandardMaterial({color: 0x0f172a, roughness: 0.4});
      disposables.push(cableGeo, cableMat);
      const cable = new THREE.Mesh(cableGeo, cableMat);
      termGroup.add(cable);

      // Стальная игла термометра (зонд Pt100)
      const probeGeo = new THREE.CylinderGeometry(0.015, 0.008, 0.7, 12);
      const probeMat = new THREE.MeshStandardMaterial({color: 0xd1d5db, metalness: 0.95, roughness: 0.15});
      disposables.push(probeGeo, probeMat);
      const probe = new THREE.Mesh(probeGeo, probeMat);
      probe.position.set(1.1, 0.15, -0.2);
      probe.rotation.z = Math.PI / 3;
      termGroup.add(probe);
    }

    // =======================================================================
    // 5. ДИНАМОМЕТР / ТАХОМЕТР
    // =======================================================================
    else {
      const dynGroup = new THREE.Group();
      node.add(dynGroup);

      // Цилиндрический корпус лабораторного динамометра
      const bodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.2, 24);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isLight ? 0x0284c7 : 0x0369a1,
        metalness: 0.3,
        roughness: 0.3,
      });
      disposables.push(bodyGeo, bodyMat);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.2;
      dynGroup.add(body);

      // Прозрачное окошко шкалы
      const windowGeo = new THREE.CylinderGeometry(0.182, 0.182, 0.6, 24, 1, true, 0, Math.PI);
      const windowMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
      });
      disposables.push(windowGeo, windowMat);
      const win = new THREE.Mesh(windowGeo, windowMat);
      win.rotation.z = Math.PI / 2;
      win.position.y = 0.2;
      dynGroup.add(win);

      // Экран показаний
      const screenGeo = new THREE.PlaneGeometry(0.55, 0.25);
      const screenTex = createFlukeLcdTexture(inst.primaryValue, inst.unit);
      disposables.push(screenGeo, screenTex);
      const screenMat = new THREE.MeshBasicMaterial({map: screenTex});
      disposables.push(screenMat);
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.rotation.x = -Math.PI / 2;
      screen.position.set(0, 0.38, 0);
      dynGroup.add(screen);
      node.userData.screenMat = screenMat;

      // Стальной крюк динамометра
      const hookGeo = new THREE.TorusGeometry(0.08, 0.02, 12, 24, Math.PI * 1.5);
      const hookMat = new THREE.MeshStandardMaterial({color: 0x94a3b8, metalness: 0.9, roughness: 0.2});
      disposables.push(hookGeo, hookMat);
      const hook = new THREE.Mesh(hookGeo, hookMat);
      hook.position.set(0.7, 0.2, 0);
      dynGroup.add(hook);
    }

    return node;
  }

  return {
    group,
    updateInstruments: (instruments: ActiveInstrument[]) => {
      // Удаляем приборы, которых больше нет
      const activeIds = new Set(instruments.map((i) => i.id));
      for (const [id, mesh] of instrumentMeshes.entries()) {
        if (!activeIds.has(id)) {
          group.remove(mesh);
          instrumentMeshes.delete(id);
        }
      }

      // Добавляем или обновляем приборы
      instruments.forEach((inst, index) => {
        let node = instrumentMeshes.get(inst.id);
        if (!node) {
          inst.positionIndex = index;
          node = createInstrumentNode(inst);
          instrumentMeshes.set(inst.id, node);
          group.add(node);
        }

        // Обновляем текстуру экрана
        if (node.userData.screenMat) {
          let newTex: THREE.CanvasTexture;
          if (inst.type === 'power_supply') {
            newTex = createPowerSupplyPanelTexture(inst.primaryValue, inst.secondaryValue);
          } else {
            newTex = createFlukeLcdTexture(inst.primaryValue, inst.unit);
          }
          disposables.push(newTex);
          node.userData.screenMat.map = newTex;
          node.userData.screenMat.needsUpdate = true;
        }
      });
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
      instrumentMeshes.clear();
    },
  };
}
