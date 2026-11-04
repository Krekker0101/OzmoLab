/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Процедурные 3D PBR модели для электрической цепи
 * Высокодетализированные составные модели (3-12 деталей) с честными материалами
 * Высокий контраст и глубина для идеальной светлой и тёмной тем
 */

import * as THREE from 'three';
import {CircuitState, Theme3DConfig, THEME_PRESETS} from '../types.ts';

// Вспомогательный генератор текстуры сетки стола с точной калибровкой контраста
export function createBenchGridTexture(config: Theme3DConfig): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Благородный цвет поверхности стола (в светлой теме светло-серо-голубой, не белый)
    ctx.fillStyle = config.gridBgColor;
    ctx.fillRect(0, 0, 1024, 1024);

    // Мелкая миллиметровая координатная сетка
    ctx.strokeStyle = config.gridSubLineColor;
    ctx.lineWidth = 1;
    const step = 32;
    for (let x = 0; x <= 1024; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Главная сетка секций (тёмно-синяя линия с низкой прозрачностью 0.2–0.25)
    ctx.strokeStyle = config.gridLineColor;
    ctx.lineWidth = 2;
    for (let x = 0; x <= 1024; x += step * 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += step * 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Техническая маркировка стенда (четкая типографика без размытия)
    ctx.fillStyle = config.gridTextColor;
    ctx.font = 'bold 20px monospace';
    ctx.fillText('OZMO LAB • CALIBRATED BENCH 01', 36, 60);
    ctx.font = '14px monospace';
    ctx.fillText('DC 0-12V • STABILIZED HIGH-PRECISION', 36, 84);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Создание процедурной карты контактных теней для приземления объектов на стол
export function createContactShadowTexture(colorStr: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 1024, 1024);

    // Пятна контактных теней под батареей, рубильником, реостатом, лампой и мультиметром
    const drawShadowSpot = (x: number, y: number, rx: number, ry: number) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      grad.addColorStop(0, colorStr);
      grad.addColorStop(0.5, colorStr.replace(/[\d.]+\)$/, '0.25)'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    // Нормализация координат стола 10.5x7.5 на canvas 1024x1024
    // Батарея: x = -3.6, z = -1.8 -> px = 175, py = 259
    drawShadowSpot(175, 259, 70, 50);
    // Рубильник: x = -1.2, z = -1.8 -> px = 409, py = 259
    drawShadowSpot(409, 259, 100, 65);
    // Реостат: x = 2.4, z = -1.8 -> px = 760, py = 259
    drawShadowSpot(760, 259, 180, 65);
    // Мультиметр: x = -1.8, z = 1.4 -> px = 350, py = 696
    drawShadowSpot(350, 696, 110, 140);
    // Лампа: x = 2.4, z = 1.4 -> px = 760, py = 696
    drawShadowSpot(760, 696, 90, 90);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Генератор текстуры этикетки 9V батареи
function createBatteryLabelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.35, '#1e3a8a');
    grad.addColorStop(0.7, '#c2410c');
    grad.addColorStop(1, '#9a3412');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 84px sans-serif';
    ctx.fillText('9V DC', 30, 160);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('HEAVY DUTY POWER', 30, 220);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '24px monospace';
    ctx.fillText('MODEL 6F22 • OZMO LAB', 30, 270);
    ctx.fillText('HIGH CURRENT DISCHARGE', 30, 310);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText('+ POSITIVE', 30, 420);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Текстура намотки нихромовой проволоки реостата
function createRheostatWireTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, 512, 512);

    for (let y = 0; y < 512; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? '#b45309' : '#78350f';
      ctx.fillRect(0, y, 512, 2);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(0, y + 2, 512, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 8);
  return texture;
}

// Управление цифровым экраном мультиметра
export class MultimeterDisplay {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  texture: THREE.CanvasTexture;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.update('9.00', 'V', true);
  }

  update(value: string, unit: string, isClosed: boolean) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Высококонтрастный фон ЖК-экрана (контрастный лабораторный LCD)
    ctx.fillStyle = '#7a9f7a';
    ctx.fillRect(0, 0, 512, 256);

    // Рамка дисплея
    ctx.strokeStyle = '#4e704e';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 244);

    // Верхняя строка статуса
    ctx.fillStyle = '#142814';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('OZMO TRUE RMS', 28, 44);
    ctx.fillText(isClosed ? 'AUTO  RUN' : 'AUTO  HOLD', 320, 44);

    // Цифровое значение 7-сегментного вида
    ctx.font = 'bold 102px monospace';
    ctx.fillText(value, 28, 175);

    // Единица измерения
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(unit, 410, 175);

    // Нижняя шкала аналогового барграфа
    ctx.fillStyle = '#1c361c';
    ctx.fillRect(28, 205, 456, 14);

    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }
}

export interface CircuitModelHandles {
  group: THREE.Group;
  switchGroup: THREE.Group;
  switchBlade: THREE.Group;
  rheostatSlider: THREE.Group;
  lampBulbMesh: THREE.Mesh;
  lampFilamentMesh: THREE.Mesh;
  lampLight: THREE.PointLight;
  multimeterDisplay: MultimeterDisplay;
  wireCurves: THREE.CatmullRomCurve3[];
  benchMesh: THREE.Mesh;
  contactShadowMesh: THREE.Mesh;
  interactiveMeshes: {
    switch: THREE.Object3D;
    rheostatSlider: THREE.Object3D;
    multimeter: THREE.Object3D;
  };
  setSwitchState: (closed: boolean) => void;
  setRheostatRatio: (ratio: number) => void;
  updateLamp: (current: number, lampPower: number) => void;
  updateMultimeter: (state: CircuitState) => void;
  updateTheme: (config: Theme3DConfig) => void;
  dispose: () => void;
}

export function createCircuitBench(isLight: boolean): CircuitModelHandles {
  const root = new THREE.Group();
  root.name = 'CircuitRoot';

  const initialConfig = isLight ? THEME_PRESETS.light : THEME_PRESETS.dark;

  // 1. ЛАБОРАТОРНЫЙ СТОЛ (СВЕТЛО-СЕРО-ГОЛУБОЙ В СВЕТЛОЙ ТЕМЕ, НЕ БЕЛЫЙ)
  let benchGridTex = createBenchGridTexture(initialConfig);
  const benchMat = new THREE.MeshStandardMaterial({
    map: benchGridTex,
    color: initialConfig.tableColor,
    roughness: initialConfig.tableRoughness,
    metalness: initialConfig.tableMetalness,
  });

  const benchGeo = new THREE.BoxGeometry(10.5, 0.4, 7.5);
  const benchMesh = new THREE.Mesh(benchGeo, benchMat);
  benchMesh.position.set(0, -0.2, 0);
  benchMesh.receiveShadow = true;
  root.add(benchMesh);

  // Фаска / металлический кант стола
  const borderMat = new THREE.MeshStandardMaterial({
    color: initialConfig.borderCol,
    roughness: 0.35,
    metalness: 0.85,
  });
  const borderGeo = new THREE.BoxGeometry(10.7, 0.38, 7.7);
  const borderMesh = new THREE.Mesh(borderGeo, borderMat);
  borderMesh.position.set(0, -0.21, 0);
  root.add(borderMesh);

  // ПЛОСКОСТЬ КОНТАКТНЫХ ТЕНЕЙ (CONTACT SHADOWS) НА СТОЛЕ
  let contactShadowTex = createContactShadowTexture(initialConfig.contactShadowColor);
  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    opacity: initialConfig.shadowOpacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const contactShadowGeo = new THREE.PlaneGeometry(10.4, 7.4);
  const contactShadowMesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
  contactShadowMesh.rotation.x = -Math.PI / 2;
  contactShadowMesh.position.set(0, 0.005, 0);
  root.add(contactShadowMesh);

  // Резиновые ножки стола
  const footGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.25, 24);
  const footMat = new THREE.MeshStandardMaterial({color: 0x090d16, roughness: 0.9});
  [
    [-4.8, -3.4],
    [4.8, -3.4],
    [-4.8, 3.4],
    [4.8, 3.4],
  ].forEach(([fx, fz]) => {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(fx, -0.48, fz);
    root.add(foot);
  });

  // НАСЫЩЕННЫЕ МАТЕРИАЛЫ ДЛЯ ЧЕТКОГО КОНТРАСТА
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x2b3445, // Тёмный металл #2b3445
    metalness: 0.85,
    roughness: 0.25,
  });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xc46a2b, // Насыщенная медь #c46a2b
    metalness: 0.95,
    roughness: 0.2,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.25,
  });

  // 2. БАТАРЕЯ 9V
  const batteryGroup = new THREE.Group();
  batteryGroup.name = 'Battery';
  batteryGroup.position.set(-3.6, 0, -1.8);

  const batteryBodyGeo = new THREE.BoxGeometry(1.0, 1.6, 0.65);
  const batteryBodyMat = new THREE.MeshStandardMaterial({
    map: createBatteryLabelTexture(),
    roughness: 0.35,
    metalness: 0.35,
  });
  const batteryBody = new THREE.Mesh(batteryBodyGeo, batteryBodyMat);
  batteryBody.position.y = 0.8;
  batteryBody.castShadow = true;
  batteryBody.receiveShadow = true;
  batteryGroup.add(batteryBody);

  const batteryTopMat = new THREE.MeshStandardMaterial({color: 0x0f172a, roughness: 0.5});
  const batteryTopGeo = new THREE.BoxGeometry(0.96, 0.08, 0.62);
  const batteryTop = new THREE.Mesh(batteryTopGeo, batteryTopMat);
  batteryTop.position.y = 1.64;
  batteryGroup.add(batteryTop);

  const posTermGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.22, 6);
  const posTerm = new THREE.Mesh(posTermGeo, metalMat);
  posTerm.position.set(0.25, 1.76, 0);
  posTerm.castShadow = true;
  batteryGroup.add(posTerm);

  const negTermGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.22, 16);
  const negTerm = new THREE.Mesh(negTermGeo, metalMat);
  negTerm.position.set(-0.25, 1.76, 0);
  negTerm.castShadow = true;
  batteryGroup.add(negTerm);

  root.add(batteryGroup);

  // 3. РУБИЛЬНИК (KNIFE SWITCH)
  const switchGroup = new THREE.Group();
  switchGroup.name = 'KnifeSwitch';
  switchGroup.position.set(-1.2, 0, -1.8);

  const switchBaseMat = new THREE.MeshStandardMaterial({
    color: initialConfig.switchBaseCol,
    roughness: 0.45,
    metalness: 0.1,
  });
  const switchBaseGeo = new THREE.BoxGeometry(1.8, 0.18, 1.0);
  const switchBase = new THREE.Mesh(switchBaseGeo, switchBaseMat);
  switchBase.position.y = 0.09;
  switchBase.castShadow = true;
  switchBase.receiveShadow = true;
  switchGroup.add(switchBase);

  const termGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.28, 16);
  const termL = new THREE.Mesh(termGeo, brassMat);
  termL.position.set(-0.65, 0.25, 0);
  termL.castShadow = true;
  switchGroup.add(termL);

  const termR = new THREE.Mesh(termGeo, brassMat);
  termR.position.set(0.65, 0.25, 0);
  termR.castShadow = true;
  switchGroup.add(termR);

  const hingeClevisGeo = new THREE.BoxGeometry(0.14, 0.35, 0.22);
  const hingeClevis = new THREE.Mesh(hingeClevisGeo, copperMat);
  hingeClevis.position.set(-0.55, 0.28, 0);
  hingeClevis.castShadow = true;
  switchGroup.add(hingeClevis);

  const jawGeo = new THREE.BoxGeometry(0.12, 0.38, 0.22);
  const jaw = new THREE.Mesh(jawGeo, copperMat);
  jaw.position.set(0.55, 0.3, 0);
  jaw.castShadow = true;
  switchGroup.add(jaw);

  const switchBlade = new THREE.Group();
  switchBlade.position.set(-0.55, 0.38, 0);

  const bladeGeo = new THREE.BoxGeometry(1.15, 0.12, 0.05);
  const bladeMesh = new THREE.Mesh(bladeGeo, copperMat);
  bladeMesh.position.x = 0.55;
  bladeMesh.castShadow = true;
  switchBlade.add(bladeMesh);

  const handleMat = new THREE.MeshStandardMaterial({color: 0x78350f, roughness: 0.6, metalness: 0.1});
  const handleGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.5, 16);
  const handleMesh = new THREE.Mesh(handleGeo, handleMat);
  handleMesh.rotation.z = Math.PI / 2;
  handleMesh.position.set(1.25, 0, 0);
  handleMesh.castShadow = true;
  switchBlade.add(handleMesh);

  switchGroup.add(switchBlade);
  root.add(switchGroup);

  // 4. ПОЛЗУНКОВЫЙ РЕОСТАТ
  const rheostatGroup = new THREE.Group();
  rheostatGroup.name = 'Rheostat';
  rheostatGroup.position.set(2.4, 0, -1.8);

  const rheoFrameMat = new THREE.MeshStandardMaterial({color: 0x1e293b, metalness: 0.8, roughness: 0.3});
  const sideFrameGeo = new THREE.BoxGeometry(0.2, 0.9, 0.9);

  const leftFrame = new THREE.Mesh(sideFrameGeo, rheoFrameMat);
  leftFrame.position.set(-1.6, 0.45, 0);
  leftFrame.castShadow = true;
  rheostatGroup.add(leftFrame);

  const rightFrame = new THREE.Mesh(sideFrameGeo, rheoFrameMat);
  rightFrame.position.set(1.6, 0.45, 0);
  rightFrame.castShadow = true;
  rheostatGroup.add(rightFrame);

  const wireTex = createRheostatWireTexture();
  const tubeMat = new THREE.MeshStandardMaterial({
    map: wireTex,
    roughness: 0.5,
    metalness: 0.4,
  });
  const tubeGeo = new THREE.CylinderGeometry(0.34, 0.34, 3.0, 32);
  const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
  tubeMesh.rotation.z = Math.PI / 2;
  tubeMesh.position.set(0, 0.42, 0);
  tubeMesh.castShadow = true;
  tubeMesh.receiveShadow = true;
  rheostatGroup.add(tubeMesh);

  const rodMat = new THREE.MeshStandardMaterial({color: 0x94a3b8, metalness: 0.95, roughness: 0.15});
  const rodGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 16);
  const rodMesh = new THREE.Mesh(rodGeo, rodMat);
  rodMesh.rotation.z = Math.PI / 2;
  rodMesh.position.set(0, 0.85, 0);
  rodMesh.castShadow = true;
  rheostatGroup.add(rodMesh);

  const rheostatSlider = new THREE.Group();
  rheostatSlider.position.set(-0.6, 0.85, 0);

  const sliderBodyMat = new THREE.MeshStandardMaterial({color: 0x090d16, roughness: 0.35});
  const sliderBodyGeo = new THREE.BoxGeometry(0.38, 0.28, 0.32);
  const sliderBody = new THREE.Mesh(sliderBodyGeo, sliderBodyMat);
  sliderBody.castShadow = true;
  rheostatSlider.add(sliderBody);

  const gripGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.3, 16);
  const gripMesh = new THREE.Mesh(gripGeo, sliderBodyMat);
  gripMesh.position.y = 0.22;
  gripMesh.castShadow = true;
  rheostatSlider.add(gripMesh);

  const wiperGeo = new THREE.BoxGeometry(0.16, 0.26, 0.08);
  const wiperMesh = new THREE.Mesh(wiperGeo, copperMat);
  wiperMesh.position.set(0, -0.22, 0);
  wiperMesh.castShadow = true;
  rheostatSlider.add(wiperMesh);

  rheostatGroup.add(rheostatSlider);

  const rheoTermL = new THREE.Mesh(termGeo, brassMat);
  rheoTermL.position.set(-1.6, 0.98, 0);
  rheoTermL.castShadow = true;
  rheostatGroup.add(rheoTermL);

  const rheoTermR = new THREE.Mesh(termGeo, brassMat);
  rheoTermR.position.set(1.6, 0.98, 0);
  rheoTermR.castShadow = true;
  rheostatGroup.add(rheoTermR);

  root.add(rheostatGroup);

  // 5. ЛАМПА НАКАЛИВАНИЯ
  const lampGroup = new THREE.Group();
  lampGroup.name = 'TungstenLamp';
  lampGroup.position.set(2.4, 0, 1.4);

  const socketMat = new THREE.MeshStandardMaterial({
    color: initialConfig.socketBaseCol,
    roughness: 0.35,
    metalness: 0.1,
  });
  const socketGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.45, 32);
  const socketMesh = new THREE.Mesh(socketGeo, socketMat);
  socketMesh.position.y = 0.225;
  socketMesh.castShadow = true;
  socketMesh.receiveShadow = true;
  lampGroup.add(socketMesh);

  const threadGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 32);
  const threadMesh = new THREE.Mesh(threadGeo, brassMat);
  threadMesh.position.y = 0.55;
  threadMesh.castShadow = true;
  lampGroup.add(threadMesh);

  // Стеклянная колба с умеренным transmission (не пересвечивается)
  const bulbGeo = new THREE.SphereGeometry(0.65, 32, 24);
  const bulbMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.32,
    roughness: 0.08,
    metalness: 0.0,
    transmission: 0.88,
    ior: 1.48,
    depthWrite: false,
  });
  const lampBulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
  lampBulbMesh.position.y = 1.25;
  lampGroup.add(lampBulbMesh);

  const leadGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8);
  const leadL = new THREE.Mesh(leadGeo, metalMat);
  leadL.position.set(-0.1, 0.95, 0);
  lampGroup.add(leadL);

  const leadR = new THREE.Mesh(leadGeo, metalMat);
  leadR.position.set(0.1, 0.95, 0);
  lampGroup.add(leadR);

  // Нить накала: в выключенном состоянии тёмно-серая #262626 без свечения
  const filamentCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.1, 1.18, 0),
    new THREE.Vector3(-0.06, 1.25, 0.04),
    new THREE.Vector3(0, 1.28, 0),
    new THREE.Vector3(0.06, 1.25, -0.04),
    new THREE.Vector3(0.1, 1.18, 0),
  ]);
  const filamentGeo = new THREE.TubeGeometry(filamentCurve, 24, 0.02, 8, false);
  const filamentMat = new THREE.MeshStandardMaterial({
    color: 0x262626,
    emissive: 0x000000,
    emissiveIntensity: 0.0,
    roughness: 0.25,
  });
  const lampFilamentMesh = new THREE.Mesh(filamentGeo, filamentMat);
  lampGroup.add(lampFilamentMesh);

  // Точечный свет от лампы: умеренный, чтобы не заливать весь стол
  const lampLight = new THREE.PointLight(0xffa834, 0.0, 5.0, 2.0);
  lampLight.position.set(0, 1.25, 0);
  lampLight.castShadow = true;
  lampLight.shadow.bias = -0.001;
  lampGroup.add(lampLight);

  const lampTermL = new THREE.Mesh(termGeo, brassMat);
  lampTermL.position.set(-0.55, 0.35, 0);
  lampGroup.add(lampTermL);

  const lampTermR = new THREE.Mesh(termGeo, brassMat);
  lampTermR.position.set(0.55, 0.35, 0);
  lampGroup.add(lampTermR);

  root.add(lampGroup);

  // 6. МУЛЬТИМЕТР (FLUKE YELLOW/GRAPHITE - ВСЕГДА ЧЕТКИЙ И ТАКТИЛЬНЫЙ)
  const meterGroup = new THREE.Group();
  meterGroup.name = 'Multimeter';
  meterGroup.position.set(-1.8, 0, 1.4);

  const holsterMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Насыщенный желтый Fluke
    roughness: 0.45,
    metalness: 0.05,
  });
  const holsterGeo = new THREE.BoxGeometry(1.6, 0.4, 2.2);
  const holsterMesh = new THREE.Mesh(holsterGeo, holsterMat);
  holsterMesh.position.y = 0.2;
  holsterMesh.castShadow = true;
  meterGroup.add(holsterMesh);

  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x18181b, // Тёмный контрастный корпус
    roughness: 0.35,
  });
  const faceGeo = new THREE.BoxGeometry(1.44, 0.42, 2.04);
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.y = 0.21;
  meterGroup.add(faceMesh);

  const multimeterDisplay = new MultimeterDisplay();
  const lcdMat = new THREE.MeshBasicMaterial({map: multimeterDisplay.texture});
  const lcdGeo = new THREE.PlaneGeometry(1.18, 0.62);
  const lcdMesh = new THREE.Mesh(lcdGeo, lcdMat);
  lcdMesh.rotation.x = -Math.PI / 2;
  lcdMesh.position.set(0, 0.425, -0.45);
  meterGroup.add(lcdMesh);

  const dialMat = new THREE.MeshStandardMaterial({color: 0x27272a, roughness: 0.3, metalness: 0.2});
  const dialGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.14, 32);
  const dialMesh = new THREE.Mesh(dialGeo, dialMat);
  dialMesh.position.set(0, 0.46, 0.25);
  meterGroup.add(dialMesh);

  const dialPointerGeo = new THREE.BoxGeometry(0.05, 0.04, 0.24);
  const dialPointerMat = new THREE.MeshBasicMaterial({color: 0xffffff});
  const dialPointer = new THREE.Mesh(dialPointerGeo, dialPointerMat);
  dialPointer.position.set(0, 0.54, 0.25);
  meterGroup.add(dialPointer);

  const probePortGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16);
  const redPort = new THREE.Mesh(probePortGeo, new THREE.MeshStandardMaterial({color: 0xdc2626}));
  redPort.position.set(0.35, 0.44, 0.75);
  meterGroup.add(redPort);

  const blackPort = new THREE.Mesh(probePortGeo, new THREE.MeshStandardMaterial({color: 0x09090b}));
  blackPort.position.set(-0.35, 0.44, 0.75);
  meterGroup.add(blackPort);

  root.add(meterGroup);

  // 7. СОЕДИНИТЕЛЬНЫЕ ПРОВОДА (НАСЫЩЕННЫЕ КОНТРАСТНЫЕ ЦВЕТА)
  const wire1Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.35, 1.76, -1.8),
    new THREE.Vector3(-2.8, 1.1, -2.1),
    new THREE.Vector3(-2.2, 0.5, -2.0),
    new THREE.Vector3(-1.85, 0.35, -1.8),
  ]);

  const wire2Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.55, 0.35, -1.8),
    new THREE.Vector3(0.0, 0.25, -2.3),
    new THREE.Vector3(0.5, 0.4, -2.1),
    new THREE.Vector3(0.8, 0.98, -1.8),
  ]);

  const wire3Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.8, 0.85, -1.8),
    new THREE.Vector3(2.6, 0.5, -0.6),
    new THREE.Vector3(2.8, 0.3, 0.4),
    new THREE.Vector3(1.85, 0.35, 1.4),
  ]);

  const wire4Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.95, 0.35, 1.4),
    new THREE.Vector3(2.1, 0.22, 2.3),
    new THREE.Vector3(0.0, 0.2, 2.5),
    new THREE.Vector3(-1.45, 0.45, 2.15),
  ]);

  const wire5Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.15, 0.45, 2.15),
    new THREE.Vector3(-3.4, 0.25, 1.2),
    new THREE.Vector3(-4.2, 0.6, -0.4),
    new THREE.Vector3(-3.85, 1.76, -1.8),
  ]);

  const wireCurves = [wire1Curve, wire2Curve, wire3Curve, wire4Curve, wire5Curve];
  // Глубокие контрастные цвета проводов: не блекнут на светлом столе
  const wireColors = [0xdc2626, 0x2563eb, 0xd97706, 0x059669, 0x1e293b];

  wireCurves.forEach((curve, i) => {
    const wireGeo = new THREE.TubeGeometry(curve, 36, 0.045, 12, false);
    const wireMat = new THREE.MeshStandardMaterial({
      color: wireColors[i],
      roughness: 0.35,
      metalness: 0.15,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.castShadow = true;
    root.add(wireMesh);
  });

  const setSwitchState = (closed: boolean) => {
    switchBlade.rotation.z = closed ? 0 : 0.85;
  };
  setSwitchState(true);

  const setRheostatRatio = (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    const posX = -1.1 + clamped * 2.2;
    rheostatSlider.position.x = posX;
  };
  setRheostatRatio(0.2);

  // Точная калибровка свечения лампы: ТОЛЬКО нить и умеренный point light
  const updateLamp = (current: number, lampPower: number) => {
    if (current <= 0.01) {
      filamentMat.color.setHex(0x262626);
      filamentMat.emissive.setHex(0x000000);
      filamentMat.emissiveIntensity = 0.0;
      lampLight.intensity = 0.0;
      return;
    }

    const factor = Math.min(1.0, current / 0.45);
    lampLight.intensity = factor * 2.2;

    // Тёплый накал: только нить превышает порог блума (0.94)
    if (factor < 0.35) {
      filamentMat.emissive.setHex(0xb45309);
      filamentMat.emissiveIntensity = 1.2;
    } else if (factor < 0.75) {
      filamentMat.emissive.setHex(0xf59e0b);
      filamentMat.emissiveIntensity = 2.4;
    } else {
      filamentMat.emissive.setHex(0xffb347); // Тёплый золотой #ffb347
      filamentMat.emissiveIntensity = 3.6;
    }
    filamentMat.color.copy(filamentMat.emissive);
  };

  const updateMultimeter = (state: CircuitState) => {
    let valStr = '0.00';
    let unitStr: string = state.multimeterMode;

    if (!state.isClosed) {
      valStr = state.multimeterMode === 'R' ? 'OL' : '0.00';
    } else {
      if (state.multimeterMode === 'V') {
        valStr = state.lampVoltage.toFixed(2);
      } else if (state.multimeterMode === 'A') {
        valStr = state.current.toFixed(2);
      } else if (state.multimeterMode === 'R') {
        valStr = (state.rheostatR + state.lampBaseR).toFixed(1);
        unitStr = 'Ω';
      }
    }

    multimeterDisplay.update(valStr, unitStr, state.isClosed);
  };

  const updateTheme = (config: Theme3DConfig) => {
    const newGridTex = createBenchGridTexture(config);
    benchMat.map?.dispose();
    benchMat.map = newGridTex;
    benchMat.color.setHex(config.tableColor);
    benchMat.roughness = config.tableRoughness;
    benchMat.metalness = config.tableMetalness;
    benchMat.needsUpdate = true;

    borderMat.color.setHex(config.borderCol);
    borderMat.needsUpdate = true;

    // Обновление контактных теней
    const newShadowTex = createContactShadowTexture(config.contactShadowColor);
    contactShadowMat.map?.dispose();
    contactShadowMat.map = newShadowTex;
    contactShadowMat.opacity = config.shadowOpacity;
    contactShadowMat.needsUpdate = true;

    switchBaseMat.color.setHex(config.switchBaseCol);
    switchBaseMat.needsUpdate = true;

    socketMat.color.setHex(config.socketBaseCol);
    socketMat.needsUpdate = true;
  };

  const dispose = () => {
    benchGridTex.dispose();
    contactShadowTex.dispose();
    multimeterDisplay.dispose();
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
    switchGroup,
    switchBlade,
    rheostatSlider,
    lampBulbMesh,
    lampFilamentMesh,
    lampLight,
    multimeterDisplay,
    wireCurves,
    benchMesh,
    contactShadowMesh,
    interactiveMeshes: {
      switch: switchBlade,
      rheostatSlider,
      multimeter: faceMesh,
    },
    setSwitchState,
    setRheostatRatio,
    updateLamp,
    updateMultimeter,
    updateTheme,
    dispose,
  };
}
