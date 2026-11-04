/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Процедурные 3D PBR модели механизмов и кинематики
 * Зубчатая передача, полиспаст (блочная система) и кривошипно-шатунный механизм
 */

import * as THREE from 'three';
import {MechanismState, Theme3DConfig} from '../types.ts';

export interface MechanismModelHandles {
  group: THREE.Group;
  updateState: (state: MechanismState) => void;
  dispose: () => void;
}

/**
 * Создает процедурную геометрию зубчатого колеса с честными зубьями
 */
function createGearGeometry(radius: number, teeth: number, thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const toothDepth = radius * 0.18;
  const outerR = radius + toothDepth;
  const innerR = radius - toothDepth * 0.6;
  const step = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.25;
    const a2 = a0 + step * 0.5;
    const a3 = a0 + step * 0.75;

    if (i === 0) {
      shape.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    } else {
      shape.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    }
    shape.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
    shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    shape.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
  }
  shape.closePath();

  // Центральное отверстие для вала
  const hole = new THREE.Path();
  const holeR = radius * 0.25;
  hole.absarc(0, 0, holeR, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const extrudeSettings = {
    steps: 1,
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.1,
    bevelSize: thickness * 0.08,
    bevelSegments: 2,
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

export function createMechanismBench(isLight: boolean, _config?: Theme3DConfig): MechanismModelHandles {
  const group = new THREE.Group();
  group.name = 'MechanismBench';

  const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

  // Базовая монтажная плита для механизмов
  const baseGeo = new THREE.BoxGeometry(4.2, 0.2, 2.6);
  const baseMat = new THREE.MeshStandardMaterial({
    color: isLight ? 0x94a3b8 : 0x1e293b,
    roughness: 0.35,
    metalness: 0.6,
  });
  disposables.push(baseGeo, baseMat);
  const basePlate = new THREE.Mesh(baseGeo, baseMat);
  basePlate.position.y = 0.1;
  basePlate.receiveShadow = true;
  group.add(basePlate);

  // =========================================================================
  // 1. ПОДГРУППА: ЗУБЧАТАЯ ПЕРЕДАЧА (GEAR TRAIN)
  // =========================================================================
  const gearsGroup = new THREE.Group();
  gearsGroup.position.set(0, 0.2, 0);
  group.add(gearsGroup);

  // Материалы шестерен
  const gearBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.85,
    roughness: 0.25,
  });
  const gearSteelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.2,
  });
  const gearBlueMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.7,
    roughness: 0.3,
  });
  disposables.push(gearBrassMat, gearSteelMat, gearBlueMat);

  // Шестерня 1 (Ведущая от мотора)
  const g1Geo = createGearGeometry(0.55, 18, 0.18);
  disposables.push(g1Geo);
  const gear1 = new THREE.Mesh(g1Geo, gearBrassMat);
  gear1.rotation.x = Math.PI / 2;
  gear1.position.set(-1.25, 0.2, 0);
  gearsGroup.add(gear1);

  // Шестерня 2 (Паразитная / промежуточная)
  const g2Geo = createGearGeometry(0.72, 24, 0.18);
  disposables.push(g2Geo);
  const gear2 = new THREE.Mesh(g2Geo, gearSteelMat);
  gear2.rotation.x = Math.PI / 2;
  gear2.position.set(0.02, 0.2, 0);
  gearsGroup.add(gear2);

  // Шестерня 3 (Ведомая выходная)
  const g3Geo = createGearGeometry(1.08, 36, 0.18);
  disposables.push(g3Geo);
  const gear3 = new THREE.Mesh(g3Geo, gearBlueMat);
  gear3.rotation.x = Math.PI / 2;
  gear3.position.set(1.82, 0.2, 0);
  gearsGroup.add(gear3);

  // Корпус приводного электродвигателя
  const motorGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.8, 24);
  const motorMat = new THREE.MeshStandardMaterial({color: 0x334155, metalness: 0.5});
  disposables.push(motorGeo, motorMat);
  const motor = new THREE.Mesh(motorGeo, motorMat);
  motor.position.set(-1.25, -0.4, 0);
  gearsGroup.add(motor);

  // =========================================================================
  // 2. ПОДГРУППА: ПОЛИСПАСТ / БЛОЧНАЯ СИСТЕМА (PULLEY SYSTEM)
  // =========================================================================
  const pulleyGroup = new THREE.Group();
  pulleyGroup.position.set(0, 0.2, 0);
  group.add(pulleyGroup);
  pulleyGroup.visible = false;

  // Опорная рама полиспаста
  const framePillarGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.2, 16);
  const frameMat = new THREE.MeshStandardMaterial({color: 0x475569, metalness: 0.8});
  disposables.push(framePillarGeo, frameMat);

  const pillarL = new THREE.Mesh(framePillarGeo, frameMat);
  pillarL.position.set(-1.2, 1.6, 0);
  pulleyGroup.add(pillarL);

  const pillarR = new THREE.Mesh(framePillarGeo, frameMat);
  pillarR.position.set(1.2, 1.6, 0);
  pulleyGroup.add(pillarR);

  // Верхняя балка
  const topBeamGeo = new THREE.BoxGeometry(2.6, 0.1, 0.3);
  disposables.push(topBeamGeo);
  const topBeam = new THREE.Mesh(topBeamGeo, frameMat);
  topBeam.position.set(0, 3.2, 0);
  pulleyGroup.add(topBeam);

  // Верхний неподвижный блок
  const sheaveGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 32);
  const sheaveMat = new THREE.MeshStandardMaterial({color: 0xd97706, metalness: 0.8});
  disposables.push(sheaveGeo, sheaveMat);

  const upperSheave = new THREE.Mesh(sheaveGeo, sheaveMat);
  upperSheave.rotation.z = Math.PI / 2;
  upperSheave.position.set(0, 2.85, 0);
  pulleyGroup.add(upperSheave);

  // Нижний подвижный блок
  const lowerBlockGroup = new THREE.Group();
  lowerBlockGroup.position.set(0, 1.4, 0);
  pulleyGroup.add(lowerBlockGroup);

  const lowerSheave = new THREE.Mesh(sheaveGeo, sheaveMat);
  lowerSheave.rotation.z = Math.PI / 2;
  lowerBlockGroup.add(lowerSheave);

  // Крюк и калиброванный подвешенный груз
  const hookGeo = new THREE.TorusGeometry(0.12, 0.03, 12, 24, Math.PI * 1.5);
  disposables.push(hookGeo);
  const hook = new THREE.Mesh(hookGeo, frameMat);
  hook.rotation.z = -Math.PI / 2;
  hook.position.set(0, -0.4, 0);
  lowerBlockGroup.add(hook);

  const loadGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.7, 24);
  const loadMat = new THREE.MeshStandardMaterial({color: 0x0284c7, metalness: 0.5});
  disposables.push(loadGeo, loadMat);
  const load = new THREE.Mesh(loadGeo, loadMat);
  load.position.set(0, -0.9, 0);
  lowerBlockGroup.add(load);

  // Трос (динамически обновляемый цилиндр)
  const ropeMat = new THREE.MeshStandardMaterial({color: 0xf8fafc, roughness: 0.8});
  disposables.push(ropeMat);

  const ropeGeoL = new THREE.CylinderGeometry(0.015, 0.015, 1.5, 8);
  disposables.push(ropeGeoL);
  const ropeL = new THREE.Mesh(ropeGeoL, ropeMat);
  ropeL.position.set(-0.35, 2.1, 0);
  pulleyGroup.add(ropeL);

  const ropeGeoR = new THREE.CylinderGeometry(0.015, 0.015, 1.5, 8);
  disposables.push(ropeGeoR);
  const ropeR = new THREE.Mesh(ropeGeoR, ropeMat);
  ropeR.position.set(0.35, 2.1, 0);
  pulleyGroup.add(ropeR);

  // =========================================================================
  // 3. ПОДГРУППА: КРИВОШИПНО-ШАТУННЫЙ МЕХАНИЗМ (SLIDER-CRANK)
  // =========================================================================
  const crankGroup = new THREE.Group();
  crankGroup.position.set(0, 0.2, 0);
  group.add(crankGroup);
  crankGroup.visible = false;

  // Маховик / кривошип
  const flywheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.12, 32);
  const flywheelMat = new THREE.MeshStandardMaterial({color: 0x475569, metalness: 0.7});
  disposables.push(flywheelGeo, flywheelMat);
  const flywheel = new THREE.Mesh(flywheelGeo, flywheelMat);
  flywheel.rotation.x = Math.PI / 2;
  flywheel.position.set(-1.2, 0.7, 0);
  crankGroup.add(flywheel);

  // Палец кривошипа
  const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 16);
  disposables.push(pinGeo);
  const pin = new THREE.Mesh(pinGeo, gearSteelMat);
  pin.position.set(0.45, 0, 0.1);
  flywheel.add(pin);

  // Шатун (Connecting Rod)
  const rodGeo = new THREE.BoxGeometry(1.6, 0.08, 0.08);
  const rodMat = new THREE.MeshStandardMaterial({color: 0xd97706, metalness: 0.8});
  disposables.push(rodGeo, rodMat);
  const rod = new THREE.Mesh(rodGeo, rodMat);
  crankGroup.add(rod);

  // Ползун / Поршень (Slider) в направляющей
  const sliderGeo = new THREE.BoxGeometry(0.6, 0.35, 0.35);
  const sliderMat = new THREE.MeshStandardMaterial({color: 0x0284c7, metalness: 0.6});
  disposables.push(sliderGeo, sliderMat);
  const slider = new THREE.Mesh(sliderGeo, sliderMat);
  slider.position.set(0.8, 0.7, 0);
  crankGroup.add(slider);

  // Направляющая труба (Cylinder guide)
  const guideGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 24, 1, true);
  const guideMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    transmission: 0.8,
  });
  disposables.push(guideGeo, guideMat);
  const guide = new THREE.Mesh(guideGeo, guideMat);
  guide.rotation.z = Math.PI / 2;
  guide.position.set(0.9, 0.7, 0);
  crankGroup.add(guide);

  let currentRot = 0;

  return {
    group,
    updateState: (state: MechanismState) => {
      // Переключение видимости в зависимости от типа механизма
      gearsGroup.visible = state.mechanismType === 'gears';
      pulleyGroup.visible = state.mechanismType === 'pulley';
      crankGroup.visible = state.mechanismType === 'slider_crank';

      if (state.isMotorOn && state.motorRpm !== 0) {
        currentRot += (state.motorRpm / 60) * 0.1;
      }

      if (state.mechanismType === 'gears') {
        gear1.rotation.z = -currentRot;
        gear2.rotation.z = currentRot * (state.gear1Teeth / state.gear2Teeth);
        gear3.rotation.z = -currentRot * (state.gear1Teeth / state.gear3Teeth);
      } else if (state.mechanismType === 'pulley') {
        const liftY = 1.0 + (state.pulleyLiftCm / 100) * 0.6;
        lowerBlockGroup.position.y = liftY;

        // Масштабирование троса под текущую высоту
        const span = 2.85 - liftY;
        ropeL.scale.set(1, span / 1.5, 1);
        ropeL.position.y = liftY + span / 2;
        ropeR.scale.set(1, span / 1.5, 1);
        ropeR.position.y = liftY + span / 2;
      } else if (state.mechanismType === 'slider_crank') {
        flywheel.rotation.z = currentRot;

        // Положение пальца кривошипа в глобальных координатах crankGroup
        const crankAngle = currentRot;
        const r = 0.45;
        const pinX = -1.2 + r * Math.cos(crankAngle);
        const pinY = 0.7 + r * Math.sin(crankAngle);

        // Положение ползуна
        const rodLength = 1.6;
        const sliderX = pinX + Math.sqrt(Math.max(0.01, rodLength * rodLength - Math.pow(pinY - 0.7, 2)));
        slider.position.x = sliderX;

        // Ориентация шатуна
        rod.position.set((pinX + sliderX) / 2, (pinY + 0.7) / 2, 0);
        rod.rotation.z = Math.atan2(0.7 - pinY, sliderX - pinX);
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
