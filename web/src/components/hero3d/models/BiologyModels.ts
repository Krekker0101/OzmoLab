/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Процедурная 3D PBR модель лабораторного микроскопа
 * Высокодетализированная составная модель (12 деталей) для биологической лаборатории
 */

import * as THREE from 'three';
import {Theme3DConfig} from '../types.ts';

export interface BiologyModelHandles {
  group: THREE.Group;
  nosepieceGroup: THREE.Group;
  stageGroup: THREE.Group;
  focusKnobL: THREE.Mesh;
  focusKnobR: THREE.Mesh;
  slideMesh: THREE.Mesh;
  illuminatorLight: THREE.PointLight;
  setMagnification: (mag: number) => void;
  setFocusPosition: (focusVal: number) => void; // 0..1
  updateTheme: (config: Theme3DConfig) => void;
  dispose: () => void;
}

export function createBiologyBench(isLight: boolean, config: Theme3DConfig): BiologyModelHandles {
  const root = new THREE.Group();
  root.name = 'BiologyRoot';

  // Материалы микроскопа
  const blackEnamelMat = new THREE.MeshStandardMaterial({
    color: 0x18181b, // Черная матовая лабораторная эмаль
    roughness: 0.35,
    metalness: 0.25,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Хромированная полированная сталь
    metalness: 0.95,
    roughness: 0.12,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Оптическая латунь
    metalness: 0.9,
    roughness: 0.2,
  });

  const glassSlideMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    roughness: 0.05,
    transmission: 0.9,
    ior: 1.52,
    depthWrite: false,
  });

  const specimenMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7, // Окрашенный препарат (метиленовый синий / люголь)
    transparent: true,
    opacity: 0.85,
  });

  // 1. ТЯЖЕЛОЕ ПОДКОВООБРАЗНОЕ ОСНОВАНИЕ МИКРОСКОПА
  const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.4, 32);
  const baseMesh = new THREE.Mesh(baseGeo, blackEnamelMat);
  baseMesh.position.set(0, 0.2, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  root.add(baseMesh);

  // Резиновые антивибрационные ножки
  [-1.1, 0, 1.1].forEach((fx) => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.15, 16), blackEnamelMat);
    foot.position.set(fx, 0.075, fx === 0 ? 1.0 : -0.8);
    root.add(foot);
  });

  // 2. ВЕРТИКАЛЬНАЯ СТОЙКА (ШТАТИВ) И ИЗОГНУТЫЙ ТУБУСОДЕРЖАТЕЛЬ
  const pillarGeo = new THREE.CylinderGeometry(0.4, 0.45, 2.6, 24);
  const pillarMesh = new THREE.Mesh(pillarGeo, blackEnamelMat);
  pillarMesh.position.set(0, 1.5, -0.6);
  pillarMesh.castShadow = true;
  root.add(pillarMesh);

  // Изогнутый штатив (Curved Arm)
  const armGeo = new THREE.BoxGeometry(0.65, 2.2, 0.7);
  const armMesh = new THREE.Mesh(armGeo, blackEnamelMat);
  armMesh.position.set(0, 2.8, -0.4);
  armMesh.rotation.x = -0.25;
  armMesh.castShadow = true;
  root.add(armMesh);

  // 3. ПРЕДМЕТНЫЙ СТОЛИК С ПРЕПАРАТОВОДИТЕЛЕМ (STAGE)
  const stageGroup = new THREE.Group();
  stageGroup.position.set(0, 1.6, 0.2);

  const stagePlateGeo = new THREE.BoxGeometry(2.4, 0.15, 2.2);
  const stagePlate = new THREE.Mesh(stagePlateGeo, blackEnamelMat);
  stagePlate.castShadow = true;
  stagePlate.receiveShadow = true;
  stageGroup.add(stagePlate);

  // Центральное световое отверстие столика
  const holeRing = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.35, 24),
    new THREE.MeshBasicMaterial({color: 0x94a3b8, side: THREE.DoubleSide})
  );
  holeRing.rotation.x = -Math.PI / 2;
  holeRing.position.set(0, 0.08, 0);
  stageGroup.add(holeRing);

  // Металлические зажимы (клеммы / clips) для фиксации стекла
  [-0.6, 0.6].forEach((cx) => {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.9), chromeMat);
    clip.position.set(cx, 0.12, 0.1);
    clip.castShadow = true;
    stageGroup.add(clip);
  });

  // Предметное стекло с покровным стеклом и образцом
  const slideGeo = new THREE.BoxGeometry(1.6, 0.04, 0.7);
  const slideMesh = new THREE.Mesh(slideGeo, glassSlideMat);
  slideMesh.position.set(0, 0.1, 0);
  slideMesh.castShadow = true;
  stageGroup.add(slideMesh);

  // Окрашенное пятно микропрепарата в центре стекла
  const specimenMesh = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), specimenMat);
  specimenMesh.rotation.x = -Math.PI / 2;
  specimenMesh.position.set(0, 0.125, 0);
  stageGroup.add(specimenMesh);

  root.add(stageGroup);

  // 4. ТУБУС С РЕВОЛЬВЕРНЫМ НАКОНЕЧНИКОМ И ОБЪЕКТИВАМИ
  const tubeGroup = new THREE.Group();
  tubeGroup.position.set(0, 3.4, 0.1);

  // Наклонный окулярный тубус
  const ocularTubeGeo = new THREE.CylinderGeometry(0.22, 0.24, 1.4, 24);
  const ocularTube = new THREE.Mesh(ocularTubeGeo, blackEnamelMat);
  ocularTube.position.set(0, 0.6, -0.15);
  ocularTube.rotation.x = 0.45;
  ocularTube.castShadow = true;
  tubeGroup.add(ocularTube);

  // Окуляр 10x
  const eyepieceGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.5, 24);
  const eyepiece = new THREE.Mesh(eyepieceGeo, chromeMat);
  eyepiece.position.set(0, 1.25, -0.45);
  eyepiece.rotation.x = 0.45;
  eyepiece.castShadow = true;
  tubeGroup.add(eyepiece);

  // Вращающийся револьверный диск (Nosepiece Turret)
  const nosepieceGroup = new THREE.Group();
  nosepieceGroup.position.set(0, -0.3, 0);

  const turretPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.2, 32), chromeMat);
  turretPlate.castShadow = true;
  nosepieceGroup.add(turretPlate);

  // 4 объектива (4x красный, 10x желтый, 40x синий, 100x белый)
  const objectivesData = [
    {angle: 0, length: 0.65, ringColor: 0x3b82f6, mag: 40}, // Активный объектив 40x
    {angle: Math.PI / 2, length: 0.5, ringColor: 0xf59e0b, mag: 10},
    {angle: Math.PI, length: 0.4, ringColor: 0xef4444, mag: 4},
    {angle: (3 * Math.PI) / 2, length: 0.75, ringColor: 0xffffff, mag: 100},
  ];

  objectivesData.forEach((obj) => {
    const objGroup = new THREE.Group();
    objGroup.position.set(Math.sin(obj.angle) * 0.45, -0.1, Math.cos(obj.angle) * 0.45);

    // Латунный/хромированный корпус объектива
    const objCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, obj.length, 16), brassMat);
    objCylinder.position.y = -obj.length / 2;
    objCylinder.castShadow = true;
    objGroup.add(objCylinder);

    // Цветовое индикаторное кольцо увеличения DIN
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.142, 0.142, 0.08, 16),
      new THREE.MeshBasicMaterial({color: obj.ringColor})
    );
    ring.position.y = -obj.length * 0.75;
    objGroup.add(ring);

    nosepieceGroup.add(objGroup);
  });

  tubeGroup.add(nosepieceGroup);
  root.add(tubeGroup);

  // 5. ВИНТЫ ГРУБОЙ И ТОЧНОЙ НАВОДКИ (COARSE & FINE FOCUS KNOBS)
  const knobGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 24);
  const knobFineGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.55, 24);

  const focusKnobL = new THREE.Mesh(knobGeo, brassMat);
  focusKnobL.rotation.z = Math.PI / 2;
  focusKnobL.position.set(-0.75, 1.8, -0.6);
  focusKnobL.castShadow = true;
  root.add(focusKnobL);

  const fineKnobL = new THREE.Mesh(knobFineGeo, chromeMat);
  fineKnobL.rotation.z = Math.PI / 2;
  fineKnobL.position.set(-0.85, 1.8, -0.6);
  root.add(fineKnobL);

  const focusKnobR = new THREE.Mesh(knobGeo, brassMat);
  focusKnobR.rotation.z = Math.PI / 2;
  focusKnobR.position.set(0.75, 1.8, -0.6);
  focusKnobR.castShadow = true;
  root.add(focusKnobR);

  const fineKnobR = new THREE.Mesh(knobFineGeo, chromeMat);
  fineKnobR.rotation.z = Math.PI / 2;
  fineKnobR.position.set(0.85, 1.8, -0.6);
  root.add(fineKnobR);

  // 6. ПОДСТОЛИЧНЫЙ КОНДЕНСОР АББЕ И ОСВЕТИТЕЛЬ
  const condenser = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.5, 24), blackEnamelMat);
  condenser.position.set(0, 1.25, 0.2);
  root.add(condenser);

  // Внутренний диодный осветитель предметного столика
  const illuminatorLight = new THREE.PointLight(0xfef08a, 1.8, 4.0, 2.0);
  illuminatorLight.position.set(0, 0.8, 0.2);
  illuminatorLight.castShadow = true;
  root.add(illuminatorLight);

  // Обновление увеличения (поворот револьвера)
  const setMagnification = (mag: number) => {
    let targetAngle = 0;
    if (mag <= 40) targetAngle = Math.PI;
    else if (mag <= 100) targetAngle = Math.PI / 2;
    else if (mag <= 400) targetAngle = 0;
    else targetAngle = (3 * Math.PI) / 2;

    nosepieceGroup.rotation.y = targetAngle;
  };

  // Перемещение предметного столика по высоте (фокусировка)
  const setFocusPosition = (focusVal: number) => {
    // focusVal in 0..1
    const clamped = Math.max(0, Math.min(1, focusVal));
    stageGroup.position.y = 1.55 + (clamped - 0.5) * 0.18;
    focusKnobL.rotation.x = clamped * Math.PI * 4;
    focusKnobR.rotation.x = clamped * Math.PI * 4;
  };

  const updateTheme = (newCfg: Theme3DConfig) => {
    // Адаптация материалов
  };

  const dispose = () => {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  };

  return {
    group: root,
    nosepieceGroup,
    stageGroup,
    focusKnobL,
    focusKnobR,
    slideMesh,
    illuminatorLight,
    setMagnification,
    setFocusPosition,
    updateTheme,
    dispose,
  };
}
