/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Процедурные 3D PBR модели для химико-физических реакций
 * Лабораторная колба Эрленмейера, магнитная мешалка, цифровая бюретка, электроды и частицы
 */

import * as THREE from 'three';
import {ReactionState, Theme3DConfig} from '../types.ts';

export interface ReactionModelHandles {
  group: THREE.Group;
  updateState: (state: ReactionState) => void;
  dispose: () => void;
}

export function createReactionBench(isLight: boolean, _config?: Theme3DConfig): ReactionModelHandles {
  const group = new THREE.Group();
  group.name = 'ReactionBench';

  const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

  // 1. Магнитная мешалка / Нагревательная плита (Magnetic Stirrer Base)
  const stirrerBaseGeo = new THREE.BoxGeometry(2.4, 0.45, 2.4);
  const stirrerBaseMat = new THREE.MeshStandardMaterial({
    color: isLight ? 0xe2e8f0 : 0x1e293b,
    roughness: 0.35,
    metalness: 0.2,
  });
  disposables.push(stirrerBaseGeo, stirrerBaseMat);
  const stirrerBase = new THREE.Mesh(stirrerBaseGeo, stirrerBaseMat);
  stirrerBase.position.set(-0.2, 0.225, 0);
  stirrerBase.castShadow = true;
  stirrerBase.receiveShadow = true;
  group.add(stirrerBase);

  // Керамическая верхняя плита
  const plateGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.06, 32);
  const plateMat = new THREE.MeshStandardMaterial({
    color: isLight ? 0xf8fafc : 0x334155,
    roughness: 0.15,
    metalness: 0.05,
  });
  disposables.push(plateGeo, plateMat);
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.set(0, 0.24, 0);
  plate.receiveShadow = true;
  stirrerBase.add(plate);

  // Ручка регулировки скорости мешалки
  const knobGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.15, 24);
  const knobMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.3,
    metalness: 0.6,
  });
  disposables.push(knobGeo, knobMat);
  const knob = new THREE.Mesh(knobGeo, knobMat);
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0.6, -0.05, 1.22);
  stirrerBase.add(knob);

  // Светодиодный индикатор работы
  const ledGeo = new THREE.SphereGeometry(0.04, 16, 16);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 0.8,
  });
  disposables.push(ledGeo, ledMat);
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.set(-0.6, 0.1, 1.22);
  stirrerBase.add(led);

  // 2. Колба Эрленмейера (Glassware with physical refraction)
  const flaskGroup = new THREE.Group();
  flaskGroup.position.set(-0.2, 0.5, 0);
  group.add(flaskGroup);

  // Стеклянный корпус колбы (PBR Glass)
  const flaskBodyGeo = new THREE.CylinderGeometry(0.35, 0.85, 1.3, 32, 1, true);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.42,
    roughness: 0.08,
    metalness: 0.05,
    transmission: 0.85,
    ior: 1.52,
    thickness: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposables.push(flaskBodyGeo, glassMat);
  const flaskBody = new THREE.Mesh(flaskBodyGeo, glassMat);
  flaskBody.position.y = 0.65;
  flaskGroup.add(flaskBody);

  // Горлышко колбы
  const neckGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.55, 32, 1, true);
  disposables.push(neckGeo);
  const neck = new THREE.Mesh(neckGeo, glassMat);
  neck.position.y = 1.55;
  flaskGroup.add(neck);

  // Дно колбы
  const bottomGeo = new THREE.CircleGeometry(0.85, 32);
  disposables.push(bottomGeo);
  const bottom = new THREE.Mesh(bottomGeo, glassMat);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.01;
  flaskGroup.add(bottom);

  // Жидкость в колбе (Dynamic Fluid Volume)
  const liquidGeo = new THREE.CylinderGeometry(0.55, 0.82, 0.8, 32);
  const liquidMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xf8fafc),
    transparent: true,
    opacity: 0.75,
    roughness: 0.2,
    metalness: 0.1,
  });
  disposables.push(liquidGeo, liquidMat);
  const liquid = new THREE.Mesh(liquidGeo, liquidMat);
  liquid.position.y = 0.42;
  flaskGroup.add(liquid);

  // Мешальник (Spinning Stir Bar inside flask)
  const stirBarGeo = new THREE.CapsuleGeometry(0.04, 0.25, 8, 16);
  const stirBarMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.1,
  });
  disposables.push(stirBarGeo, stirBarMat);
  const stirBar = new THREE.Mesh(stirBarGeo, stirBarMat);
  stirBar.rotation.z = Math.PI / 2;
  stirBar.position.y = 0.06;
  flaskGroup.add(stirBar);

  // 3. Лабораторный штатив (Retort Stand) с Бюреткой
  const standGroup = new THREE.Group();
  standGroup.position.set(1.1, 0, -0.6);
  group.add(standGroup);

  // Чугунное основание штатива
  const standBaseGeo = new THREE.BoxGeometry(0.9, 0.12, 1.4);
  const standBaseMat = new THREE.MeshStandardMaterial({
    color: isLight ? 0x475569 : 0x0f172a,
    roughness: 0.6,
    metalness: 0.8,
  });
  disposables.push(standBaseGeo, standBaseMat);
  const standBase = new THREE.Mesh(standBaseGeo, standBaseMat);
  standBase.position.y = 0.06;
  standBase.castShadow = true;
  standGroup.add(standBase);

  // Стальной стержень штатива
  const rodGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.8, 16);
  const rodMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.25,
    metalness: 0.9,
  });
  disposables.push(rodGeo, rodMat);
  const rod = new THREE.Mesh(rodGeo, rodMat);
  rod.position.set(0.2, 1.9, -0.4);
  standGroup.add(rod);

  // Муфта штатива (Clamp bosshead)
  const clampGeo = new THREE.BoxGeometry(0.18, 0.14, 0.25);
  const clampMat = new THREE.MeshStandardMaterial({color: 0x334155, metalness: 0.7});
  disposables.push(clampGeo, clampMat);
  const clamp = new THREE.Mesh(clampGeo, clampMat);
  clamp.position.set(0.2, 2.6, -0.4);
  standGroup.add(clamp);

  // Лапка-держатель бюретки
  const armGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.9, 12);
  disposables.push(armGeo);
  const arm = new THREE.Mesh(armGeo, rodMat);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, 0, 0.45);
  clamp.add(arm);

  // 4. Стеклянная бюретка (Graduated Burette)
  const buretteGroup = new THREE.Group();
  buretteGroup.position.set(-1.3, 2.7, 0.6); // Над горлышком колбы
  standGroup.add(buretteGroup);

  const buretteTubeGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.0, 24, 1, true);
  disposables.push(buretteTubeGeo);
  const buretteTube = new THREE.Mesh(buretteTubeGeo, glassMat);
  buretteGroup.add(buretteTube);

  // Жидкость титранта в бюретке
  const buretteLiquidGeo = new THREE.CylinderGeometry(0.082, 0.082, 1.8, 24);
  const buretteLiquidMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.65,
  });
  disposables.push(buretteLiquidGeo, buretteLiquidMat);
  const buretteLiquid = new THREE.Mesh(buretteLiquidGeo, buretteLiquidMat);
  buretteGroup.add(buretteLiquid);

  // Кран бюретки (Stopcock)
  const stopcockGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 16);
  const stopcockMat = new THREE.MeshStandardMaterial({color: 0x0284c7, metalness: 0.4});
  disposables.push(stopcockGeo, stopcockMat);
  const stopcock = new THREE.Mesh(stopcockGeo, stopcockMat);
  stopcock.rotation.z = Math.PI / 2;
  stopcock.position.y = -1.05;
  buretteGroup.add(stopcock);

  // Носик бюретки
  const tipGeo = new THREE.ConeGeometry(0.08, 0.35, 16, 1, true);
  disposables.push(tipGeo);
  const tip = new THREE.Mesh(tipGeo, glassMat);
  tip.rotation.x = Math.PI;
  tip.position.y = -1.25;
  buretteGroup.add(tip);

  // Падающая капля титранта (Animated Droplet)
  const dropGeo = new THREE.SphereGeometry(0.035, 12, 12);
  const dropMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
  });
  disposables.push(dropGeo, dropMat);
  const drop = new THREE.Mesh(dropGeo, dropMat);
  drop.position.y = -1.45;
  buretteGroup.add(drop);

  // 5. Пузырьки газа для электролиза (Bubble Particle Cloud)
  const bubbleCount = 28;
  const bubbleGeo = new THREE.SphereGeometry(0.025, 8, 8);
  const bubbleMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
  });
  disposables.push(bubbleGeo, bubbleMat);

  const bubblesGroup = new THREE.Group();
  for (let i = 0; i < bubbleCount; i++) {
    const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
    bubble.position.set(
      (Math.random() - 0.5) * 0.7,
      Math.random() * 0.7 + 0.1,
      (Math.random() - 0.5) * 0.7
    );
    bubble.userData = {speed: 0.015 + Math.random() * 0.02, initialY: bubble.position.y};
    bubblesGroup.add(bubble);
  }
  flaskGroup.add(bubblesGroup);
  bubblesGroup.visible = false;

  // 6. Платиновые электроды для электролиза
  const electrodesGroup = new THREE.Group();
  electrodesGroup.position.set(0, 1.4, 0);
  flaskGroup.add(electrodesGroup);

  const electrodeGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.1, 12);
  const electrodeMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.95,
    roughness: 0.15,
  });
  disposables.push(electrodeGeo, electrodeMat);

  const anode = new THREE.Mesh(electrodeGeo, electrodeMat);
  anode.position.set(-0.15, -0.4, 0);
  electrodesGroup.add(anode);

  const cathode = new THREE.Mesh(electrodeGeo, electrodeMat);
  cathode.position.set(0.15, -0.4, 0);
  electrodesGroup.add(cathode);
  electrodesGroup.visible = false;

  let animTime = 0;

  return {
    group,
    updateState: (state: ReactionState) => {
      animTime += 0.03;

      // Обновление цвета жидкости
      liquidMat.color.set(state.liquidColor);

      // Высота уровня жидкости в зависимости от объема
      const totalVol = Math.min(100, state.initialVolumeMl + state.titrantAddedMl);
      const targetScaleY = 0.5 + (totalVol / 100) * 0.9;
      liquid.scale.set(1, targetScaleY, 1);
      liquid.position.y = 0.15 + (targetScaleY * 0.8) / 2;

      // Вращение магнитного мешальника
      if (state.isStirrerOn && state.stirrerSpeedRpm > 0) {
        stirBar.rotation.y += (state.stirrerSpeedRpm / 60) * 0.1;
      }

      // Капли при титровании
      if (state.reactionType === 'titration' && state.titrantAddedMl < 50) {
        drop.visible = true;
        drop.position.y = -1.45 - ((animTime * 2) % 0.8);
      } else {
        drop.visible = false;
      }

      // Режим электролиза: показать электроды и пузырьки
      if (state.reactionType === 'electrolysis') {
        electrodesGroup.visible = true;
        bubblesGroup.visible = state.currentElectrolysisA > 0;
        bubblesGroup.children.forEach((b) => {
          b.position.y += b.userData.speed;
          if (b.position.y > 0.8) {
            b.position.y = 0.1;
          }
        });
      } else {
        electrodesGroup.visible = false;
        bubblesGroup.visible = false;
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
