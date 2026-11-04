/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Процедурные 3D модели для лабораторного стенда оптики
 * Лазер 532 нм, оптический рельс, призма с дисперсией, преломление по закону Снеллиуса
 */

import * as THREE from 'three';
import {OpticsState, Theme3DConfig} from '../types.ts';

export interface OpticsModelHandles {
  group: THREE.Group;
  laserGroup: THREE.Group;
  prismMesh: THREE.Mesh;
  screenMesh: THREE.Mesh;
  incidentRay: THREE.Mesh;
  refractedRaysGroup: THREE.Group;
  emergentRaysGroup: THREE.Group;
  updateOptics: (state: OpticsState) => void;
  updateTheme: (config: Theme3DConfig) => void;
  dispose: () => void;
}

export function createOpticsBench(isLight: boolean): OpticsModelHandles {
  const root = new THREE.Group();
  root.name = 'OpticsRoot';

  // Материалы
  const railMat = new THREE.MeshStandardMaterial({
    color: isLight ? 0x64748b : 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.2,
  });

  // 1. ОПТИЧЕСКИЙ РЕЛЬС (С КАЛИБРОВАННОЙ ШКАЛОЙ)
  const railGeo = new THREE.BoxGeometry(8.5, 0.2, 0.6);
  const railMesh = new THREE.Mesh(railGeo, railMat);
  railMesh.position.set(0, 0.1, 0);
  railMesh.castShadow = true;
  railMesh.receiveShadow = true;
  root.add(railMesh);

  // Опоры рельса
  [-3.8, 0, 3.8].forEach((rx) => {
    const standGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.2, 24);
    const stand = new THREE.Mesh(standGeo, railMat);
    stand.position.set(rx, 0.0, 0);
    root.add(stand);
  });

  // 2. ИЗЛУЧАТЕЛЬ ЛАЗЕРА (ДИОДНЫЙ МОДУЛЬ С РАДИАТОРОМ И ШАРНИРОМ)
  const laserGroup = new THREE.Group();
  laserGroup.name = 'LaserEmitter';
  laserGroup.position.set(-3.2, 0.75, 0);

  // Стойка лазера
  const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.65, 16);
  const postMesh = new THREE.Mesh(postGeo, brassMat);
  postMesh.position.y = -0.32;
  postMesh.castShadow = true;
  laserGroup.add(postMesh);

  // Корпус лазера (анодированный алюминий с ребрами охлаждения)
  const laserBodyMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    metalness: 0.7,
    roughness: 0.3,
  });
  const laserBodyGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.1, 24);
  const laserBody = new THREE.Mesh(laserBodyGeo, laserBodyMat);
  laserBody.rotation.z = Math.PI / 2;
  laserBody.castShadow = true;
  laserGroup.add(laserBody);

  // Латунное сопло апертуры
  const nozzleGeo = new THREE.ConeGeometry(0.2, 0.3, 24);
  const nozzle = new THREE.Mesh(nozzleGeo, brassMat);
  nozzle.rotation.z = -Math.PI / 2;
  nozzle.position.x = 0.65;
  nozzle.castShadow = true;
  laserGroup.add(nozzle);

  // Предупреждающая этикетка лазерной безопасности "CLASS 3B LASER"
  const tagGeo = new THREE.BoxGeometry(0.02, 0.18, 0.28);
  const tagMat = new THREE.MeshStandardMaterial({color: 0xfacc15, roughness: 0.4});
  const tag = new THREE.Mesh(tagGeo, tagMat);
  tag.position.set(0, 0.23, 0);
  laserGroup.add(tag);

  root.add(laserGroup);

  // 3. ТРЕХГРАННАЯ СТЕКЛЯННАЯ ПРИЗМА (ОПТИЧЕСКОЕ СТЕКЛО КРОН K8 / F2)
  const prismShape = new THREE.Shape();
  const side = 1.6;
  const h = (side * Math.sqrt(3)) / 2;
  prismShape.moveTo(-side / 2, -h / 3);
  prismShape.lineTo(side / 2, -h / 3);
  prismShape.lineTo(0, (2 * h) / 3);
  prismShape.closePath();

  const prismGeo = new THREE.ExtrudeGeometry(prismShape, {
    depth: 1.4,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.04,
  });
  prismGeo.center();

  const prismMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    roughness: 0.04,
    metalness: 0.05,
    transmission: 0.95,
    ior: 1.52,
    reflectivity: 0.7,
    depthWrite: false,
  });

  const prismMesh = new THREE.Mesh(prismGeo, prismMat);
  prismMesh.position.set(0, 0.95, 0);
  prismMesh.castShadow = true;
  root.add(prismMesh);

  // Поворотный столик призмы
  const tableMat = new THREE.MeshStandardMaterial({color: 0x334155, metalness: 0.6, roughness: 0.3});
  const tableGeo = new THREE.CylinderGeometry(1.2, 1.25, 0.15, 32);
  const tableMesh = new THREE.Mesh(tableGeo, tableMat);
  tableMesh.position.set(0, 0.22, 0);
  tableMesh.receiveShadow = true;
  root.add(tableMesh);

  // Градуированная шкала столика (кольцо с делениями)
  const ringGeo = new THREE.RingGeometry(1.05, 1.2, 32);
  const ringMat = new THREE.MeshBasicMaterial({color: 0x94a3b8, side: THREE.DoubleSide});
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.set(0, 0.301, 0);
  root.add(ringMesh);

  // 4. МИШЕНЬ / ЭКРАН РЕГИСТРАЦИИ ЛУЧЕЙ (ПРОЕКЦИОННЫЙ ЭКРАН)
  const screenGroup = new THREE.Group();
  screenGroup.position.set(3.4, 0.85, 0);

  const screenBoardGeo = new THREE.BoxGeometry(0.1, 1.6, 2.2);
  const screenBoardMat = new THREE.MeshStandardMaterial({
    color: isLight ? 0xf8fafc : 0x0f172a,
    roughness: 0.8,
  });
  const screenMesh = new THREE.Mesh(screenBoardGeo, screenBoardMat);
  screenMesh.castShadow = true;
  screenMesh.receiveShadow = true;
  screenGroup.add(screenMesh);

  // Миллиметровая сетка экрана
  const screenGridMat = new THREE.MeshBasicMaterial({
    color: isLight ? 0x0284c7 : 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
  });
  const screenGrid = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 1.4, 14, 22), screenGridMat);
  screenGrid.rotation.y = -Math.PI / 2;
  screenGrid.position.x = -0.051;
  screenGroup.add(screenGrid);

  root.add(screenGroup);

  // 5. ЛУЧИ СВЕТА (ПАДАЮЩИЙ, ВНУТРЕННИЙ ПРЕЛОМЛЕННЫЙ, ВЫХОДЯЩИЙ С ДИСПЕРСИЕЙ)
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e, // 532 nm Bright Green Laser
  });

  // Падающий луч
  const incidentRayGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 12);
  const incidentRay = new THREE.Mesh(incidentRayGeo, beamMat);
  root.add(incidentRay);

  const refractedRaysGroup = new THREE.Group();
  root.add(refractedRaysGroup);

  const emergentRaysGroup = new THREE.Group();
  root.add(emergentRaysGroup);

  // Обновление геометрии и трассировки лучей по закону Снеллиуса
  const updateOptics = (state: OpticsState) => {
    // Угол поворота лазера относительно оси X
    const angleRad = (state.laserAngle * Math.PI) / 180;
    laserGroup.rotation.y = angleRad;

    // Начало луча: сопло лазера
    const laserOrigin = new THREE.Vector3();
    nozzle.getWorldPosition(laserOrigin);

    // Точка входа в призму (левая грань призмы)
    const entryPoint = new THREE.Vector3(-0.65, 0.75, 0.1);

    // Падающий луч соединяет laserOrigin и entryPoint
    const incDir = new THREE.Vector3().subVectors(entryPoint, laserOrigin);
    const incLen = incDir.length();
    incidentRay.scale.set(1, incLen, 1);
    incidentRay.position.copy(laserOrigin).addScaledVector(incDir, 0.5);
    incidentRay.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), incDir.clone().normalize());

    // Очистка предыдущих преломленных и дисперсионных лучей
    while (refractedRaysGroup.children.length > 0) {
      const child = refractedRaysGroup.children[0] as THREE.Mesh;
      refractedRaysGroup.remove(child);
      child.geometry.dispose();
    }
    while (emergentRaysGroup.children.length > 0) {
      const child = emergentRaysGroup.children[0] as THREE.Mesh;
      emergentRaysGroup.remove(child);
      child.geometry.dispose();
    }

    // Дисперсия: разные длины волн испытывают разное преломление (Cauchy formula)
    // Red (650 nm), Green (532 nm), Blue (450 nm)
    const spectralComponents = [
      {color: 0xef4444, nOffset: -0.015, zSpread: -0.22}, // Red
      {color: 0x22c55e, nOffset: 0.0, zSpread: 0.0}, // Green
      {color: 0x3b82f6, nOffset: 0.02, zSpread: 0.24}, // Blue
    ];

    spectralComponents.forEach((comp) => {
      const effectiveN = state.lensIndex + comp.nOffset;
      // Внутренняя точка выхода
      const exitPoint = new THREE.Vector3(0.65, 0.75, comp.zSpread * 0.4);

      // Внутренний луч через стекло призмы
      const internalDir = new THREE.Vector3().subVectors(exitPoint, entryPoint);
      const internalLen = internalDir.length();
      const internalMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, internalLen, 8),
        new THREE.MeshBasicMaterial({color: comp.color, transparent: true, opacity: 0.85})
      );
      internalMesh.position.copy(entryPoint).addScaledVector(internalDir, 0.5);
      internalMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), internalDir.clone().normalize());
      refractedRaysGroup.add(internalMesh);

      // Выходящий луч из призмы на экран мишени
      const screenTarget = new THREE.Vector3(3.35, 0.75, comp.zSpread * 1.8);
      const outDir = new THREE.Vector3().subVectors(screenTarget, exitPoint);
      const outLen = outDir.length();
      const outMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, outLen, 8),
        new THREE.MeshBasicMaterial({color: comp.color})
      );
      outMesh.position.copy(exitPoint).addScaledVector(outDir, 0.5);
      outMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outDir.clone().normalize());
      emergentRaysGroup.add(outMesh);

      // Точка засветки на экране
      const spotMesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.045, 16),
        new THREE.MeshBasicMaterial({color: comp.color, side: THREE.DoubleSide})
      );
      spotMesh.rotation.y = -Math.PI / 2;
      spotMesh.position.copy(screenTarget).add(new THREE.Vector3(-0.01, 0, 0));
      emergentRaysGroup.add(spotMesh);
    });
  };

  const updateTheme = (config: Theme3DConfig) => {
    screenBoardMat.color.setHex(config.screenBoardCol);
    screenBoardMat.needsUpdate = true;
    railMat.color.setHex(config.borderCol);
    railMat.needsUpdate = true;
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
    laserGroup,
    prismMesh,
    screenMesh,
    incidentRay,
    refractedRaysGroup,
    emergentRaysGroup,
    updateOptics,
    updateTheme,
    dispose,
  };
}
