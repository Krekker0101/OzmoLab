/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — 3D Провода и визуализация тока на монтажном столе
 * Реализует физические гибкие кабели (Catmull-Rom) с наконечниками типа "банан"
 * и плавной анимацией движения электронов по цепи.
 */

import * as THREE from 'three';
import {Wire} from '../../../../../shared/types.ts';

export interface WireMeshHandle {
  group: THREE.Group;
  updateWires: (
    wires: Wire[],
    terminalWorldPositions: Map<string, THREE.Vector3>,
    timeDelta: number
  ) => void;
  dispose: () => void;
}

export function createWorkbenchWireSystem(): WireMeshHandle {
  const group = new THREE.Group();
  group.name = 'WorkbenchWires';

  const disposables: (THREE.BufferGeometry | THREE.Material)[] = [];
  const wireMeshes = new Map<
    string,
    {
      cableMesh: THREE.Mesh;
      plugMesh1: THREE.Mesh;
      plugMesh2: THREE.Mesh;
      curve: THREE.CatmullRomCurve3;
      wire: Wire;
    }
  >();

  // Общее хранилище частиц электронов для всех активных проводов
  const particleCount = 72;
  const particleGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const particleMat = new THREE.MeshBasicMaterial({color: 0x38bdf8});
  disposables.push(particleGeo, particleMat);

  const particlesInstanced = new THREE.InstancedMesh(particleGeo, particleMat, particleCount);
  particlesInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(particlesInstanced);

  // Общая геометрия штекера "банан" (4мм лабораторный штекер с гибкой гильзой)
  const plugSleeveGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.28, 16);
  const plugPinGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12);
  const goldPinMat = new THREE.MeshStandardMaterial({color: 0xd97706, metalness: 0.95, roughness: 0.2});
  disposables.push(plugSleeveGeo, plugPinGeo, goldPinMat);

  const dummy = new THREE.Object3D();
  let particleProgress = 0;

  function createBananaPlug(color: number): THREE.Mesh {
    const plugMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.15,
    });
    disposables.push(plugMat);
    const sleeve = new THREE.Mesh(plugSleeveGeo, plugMat);
    sleeve.castShadow = true;

    const pin = new THREE.Mesh(plugPinGeo, goldPinMat);
    pin.position.y = -0.2;
    sleeve.add(pin);
    return sleeve;
  }

  return {
    group,
    updateWires: (wires, terminalWorldPositions, timeDelta) => {
      // 1. Очистка проводов, которых больше нет
      const activeIds = new Set(wires.map((w) => w.id));
      for (const [id, item] of wireMeshes.entries()) {
        if (!activeIds.has(id)) {
          group.remove(item.cableMesh);
          group.remove(item.plugMesh1);
          group.remove(item.plugMesh2);
          item.cableMesh.geometry.dispose();
          if (Array.isArray(item.cableMesh.material)) {
            item.cableMesh.material.forEach((m) => m.dispose());
          } else {
            item.cableMesh.material.dispose();
          }
          wireMeshes.delete(id);
        }
      }

      // 2. Создание или обновление каждого провода
      wires.forEach((wire) => {
        const fromKey = `${wire.from.componentId}:${wire.from.terminalId}`;
        const toKey = `${wire.to.componentId}:${wire.to.terminalId}`;
        const p1 = terminalWorldPositions.get(fromKey);
        const p2 = terminalWorldPositions.get(toKey);

        if (!p1 || !p2) return;

        let entry = wireMeshes.get(wire.id);

        const dist = p1.distanceTo(p2);
        // Формируем точки естественного провисания кабеля
        const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const sag = Math.max(0.12, Math.min(0.55, dist * 0.18));
        midPoint.y = Math.max(0.06, Math.min(p1.y, p2.y) + 0.14 - sag);

        const cp1 = new THREE.Vector3(p1.x, p1.y + 0.38, p1.z);
        const cp2 = new THREE.Vector3(p2.x, p2.y + 0.38, p2.z);

        const curve = new THREE.CatmullRomCurve3([p1, cp1, midPoint, cp2, p2]);
        const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.042, 8, false);

        // Определение цвета изоляции провода
        let color = 0x0284c7; // Синий по умолчанию
        if (wire.from.terminalId === 'pos' || wire.to.terminalId === 'pos') {
          color = 0xef4444; // Красный провод (+)
        } else if (wire.from.terminalId === 'neg' || wire.to.terminalId === 'neg') {
          color = 0x1e293b; // Черный провод (-)
        } else if (wire.isOverheated) {
          color = 0xdc2626; // Перегретый провод
        }

        if (!entry) {
          const cableMat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.35,
            metalness: 0.1,
            emissive: wire.isOverheated ? 0xef4444 : 0x000000,
            emissiveIntensity: wire.isOverheated ? 0.6 : 0,
          });

          const cableMesh = new THREE.Mesh(tubeGeo, cableMat);
          cableMesh.castShadow = true;
          cableMesh.receiveShadow = true;
          group.add(cableMesh);

          // Штекер 1
          const plugMesh1 = createBananaPlug(color);
          plugMesh1.position.copy(p1);
          plugMesh1.position.y += 0.12;
          group.add(plugMesh1);

          // Штекер 2
          const plugMesh2 = createBananaPlug(color);
          plugMesh2.position.copy(p2);
          plugMesh2.position.y += 0.12;
          group.add(plugMesh2);

          entry = {cableMesh, plugMesh1, plugMesh2, curve, wire};
          wireMeshes.set(wire.id, entry);
        } else {
          entry.cableMesh.geometry.dispose();
          entry.cableMesh.geometry = tubeGeo;
          entry.curve = curve;
          entry.wire = wire;

          entry.plugMesh1.position.copy(p1);
          entry.plugMesh1.position.y += 0.12;

          entry.plugMesh2.position.copy(p2);
          entry.plugMesh2.position.y += 0.12;
        }
      });

      // 3. Анимация движения электронов вдоль проводящих ветвей цепи
      particleProgress = (particleProgress + timeDelta * 0.7) % 1.0;
      let particleIdx = 0;

      for (const [, item] of wireMeshes) {
        const current = item.wire.current || 0;
        if (current <= 0.001) continue;

        const countForThisWire = 8;
        for (let i = 0; i < countForThisWire && particleIdx < particleCount; i++) {
          const t = (particleProgress + i / countForThisWire) % 1.0;
          const pos = item.curve.getPoint(t);
          dummy.position.copy(pos);
          dummy.scale.setScalar(1.0);
          dummy.updateMatrix();
          particlesInstanced.setMatrixAt(particleIdx++, dummy.matrix);
        }
      }

      // Скрываем неиспользованные частицы за пределами стола
      while (particleIdx < particleCount) {
        dummy.position.set(0, -999, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        particlesInstanced.setMatrixAt(particleIdx++, dummy.matrix);
      }
      particlesInstanced.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
      for (const [, item] of wireMeshes) {
        item.cableMesh.geometry.dispose();
        if (Array.isArray(item.cableMesh.material)) {
          item.cableMesh.material.forEach((m) => m.dispose());
        } else {
          item.cableMesh.material.dispose();
        }
      }
      wireMeshes.clear();
    },
  };
}
