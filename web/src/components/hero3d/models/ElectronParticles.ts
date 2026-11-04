/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Частицы-электроны вдоль проводов через InstancedMesh
 * Высокая производительность (1 draw call, 60 FPS, zero GC)
 */

import * as THREE from 'three';

const _dummy = new THREE.Object3D();
const _pos = new THREE.Vector3();
const _tangent = new THREE.Vector3();

export interface ElectronParticlesHandle {
  mesh: THREE.InstancedMesh;
  update: (delta: number, current: number, isClosed: boolean) => void;
  dispose: () => void;
}

export function createElectronParticles(wireCurves: THREE.CatmullRomCurve3[]): ElectronParticlesHandle {
  const particlesPerCurve = 24;
  const totalCount = wireCurves.length * particlesPerCurve;

  // Геометрия светящейся сферической частицы
  const geo = new THREE.SphereGeometry(0.045, 12, 12);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8, // Яркий неоновый циан
  });

  const instancedMesh = new THREE.InstancedMesh(geo, mat, totalCount);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instancedMesh.frustumCulled = false;

  // Массив смещений фазы для каждой частицы: curveIndex, t (0..1)
  const particles: Array<{curveIndex: number; t: number; speedOffset: number}> = [];

  for (let c = 0; c < wireCurves.length; c++) {
    for (let p = 0; p < particlesPerCurve; p++) {
      particles.push({
        curveIndex: c,
        t: p / particlesPerCurve,
        speedOffset: 0.9 + Math.random() * 0.2,
      });
    }
  }

  // Обновление позиций частиц
  const update = (delta: number, current: number, isClosed: boolean) => {
    if (!isClosed || current <= 0.005) {
      // Когда цепь разомкнута, частицы неподвижны и деликатно затухают
      mat.color.setHex(0x64748b);
      return;
    }

    mat.color.setHex(0x38bdf8);

    // Скорость пропорциональна току (I в амперах)
    const baseSpeed = current * 0.45;

    for (let i = 0; i < totalCount; i++) {
      const p = particles[i];
      p.t += delta * baseSpeed * p.speedOffset;
      if (p.t > 1.0) {
        p.t -= 1.0;
      }

      const curve = wireCurves[p.curveIndex];
      curve.getPointAt(p.t, _pos);
      curve.getTangentAt(p.t, _tangent);

      _dummy.position.copy(_pos);
      _dummy.scale.setScalar(1.0 + Math.sin(p.t * Math.PI * 4) * 0.15);
      _dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, _dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
  };

  const dispose = () => {
    geo.dispose();
    mat.dispose();
  };

  return {
    mesh: instancedMesh,
    update,
    dispose,
  };
}
