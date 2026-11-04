/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Движок 3D-сцены Hero-секции
 * WebGLRenderer, OrbitControls, PBR-освещение, UnrealBloom, честная физика и плавное переключение тем
 */

import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

import {createCircuitBench, CircuitModelHandles} from './models/CircuitModels.ts';
import {createElectronParticles, ElectronParticlesHandle} from './models/ElectronParticles.ts';
import {createOpticsBench, OpticsModelHandles} from './models/OpticsModels.ts';
import {createBiologyBench, BiologyModelHandles} from './models/BiologyModels.ts';
import {createReactionBench, ReactionModelHandles} from './models/ReactionModels.ts';
import {createMechanismBench, MechanismModelHandles} from './models/MechanismModels.ts';
import {createInstrumentBench, InstrumentModelHandles} from './models/InstrumentModels.ts';
import {
  ActiveInstrument,
  BenchMode,
  BiologyState,
  CircuitState,
  InteractiveHitObject,
  MechanismState,
  OpticsState,
  QualityLevel,
  ReactionState,
  Theme3DConfig,
  THEME_PRESETS,
} from './types.ts';

export function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export interface Hero3DSceneCallbacks {
  onSwitchToggle?: (newState: boolean) => void;
  onRheostatChange?: (newR: number) => void;
  onMeterModeChange?: (newMode: 'V' | 'A' | 'R') => void;
  onLaserAngleChange?: (newAngle: number) => void;
  onHoverObject?: (item: InteractiveHitObject | null) => void;
  onFlyComplete?: () => void;
}

export class Hero3DSceneManager {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  composer: EffectComposer | null = null;
  bloomPass: UnrealBloomPass | null = null;

  isSoftwareGl: boolean;
  quality: QualityLevel = 'auto';
  mode: BenchMode = 'circuit';
  isLight: boolean;

  // Освещение
  keyLight!: THREE.DirectionalLight;
  hemiLight!: THREE.HemisphereLight;
  rimLight!: THREE.DirectionalLight;

  // Модели
  circuitHandles: CircuitModelHandles;
  electronHandles: ElectronParticlesHandle;
  opticsHandles: OpticsModelHandles;
  biologyHandles: BiologyModelHandles;
  reactionHandles: ReactionModelHandles;
  mechanismHandles: MechanismModelHandles;
  instrumentHandles: InstrumentModelHandles;

  callbacks: Hero3DSceneCallbacks;

  // Состояние темы и плавный 400мс lerp
  currentConfig: Theme3DConfig;
  targetConfig: Theme3DConfig;
  themeLerpTime = 1.0; // 0..1 (1 = завершено)
  lerpDuration = 0.4; // 400 мс

  // Рейкастинг и взаимодействие
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2(-100, -100);
  isDraggingRheostat = false;
  isDraggingLaser = false;
  hoveredObject: InteractiveHitObject | null = null;

  // Анимационный цикл
  clock = new THREE.Clock();
  frameId = 0;
  isDestroyed = false;

  // Плавный полет камеры ("В лабораторию")
  isFlyingToLab = false;
  flyProgress = 0;
  flyStartPos = new THREE.Vector3();
  flyTargetPos = new THREE.Vector3(0, 1.8, 3.6);
  flyStartLookAt = new THREE.Vector3();
  flyTargetLookAt = new THREE.Vector3(0, 0.4, 0);

  // Параллакс
  targetCameraOffset = new THREE.Vector2(0, 0);
  currentCameraOffset = new THREE.Vector2(0, 0);

  constructor(container: HTMLElement, isLight: boolean, callbacks: Hero3DSceneCallbacks) {
    this.container = container;
    this.isLight = isLight;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();

    this.currentConfig = isLight ? {...THEME_PRESETS.light} : {...THEME_PRESETS.dark};
    this.targetConfig = isLight ? {...THEME_PRESETS.light} : {...THEME_PRESETS.dark};

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    // 1. WebGLRenderer с ACESFilmic и точной экспозицией
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.currentConfig.exposure;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 2. Сцена и камера
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 5.6, 8.4);

    // 3. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2.15;
    this.controls.minPolarAngle = Math.PI / 8;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 13.0;
    this.controls.target.set(0, 0.4, 0);
    this.controls.update();

    // 4. Окружение RoomEnvironment (PMREM) с контролируемой интенсивностью
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTexture;
    if ('environmentIntensity' in this.scene) {
      (this.scene as unknown as {environmentIntensity: number}).environmentIntensity = this.currentConfig.envIntensity;
    }
    pmremGenerator.dispose();

    // 5. Освещение студии (Key + Fill + Rim)
    this.setupLighting();

    // 6. Модели
    this.circuitHandles = createCircuitBench(this.isLight);
    this.electronHandles = createElectronParticles(this.circuitHandles.wireCurves);
    this.scene.add(this.circuitHandles.group);
    this.scene.add(this.electronHandles.mesh);

    this.opticsHandles = createOpticsBench(this.isLight);
    this.scene.add(this.opticsHandles.group);
    this.opticsHandles.group.visible = false;

    this.biologyHandles = createBiologyBench(this.isLight, this.currentConfig);
    this.scene.add(this.biologyHandles.group);
    this.biologyHandles.group.visible = false;

    this.reactionHandles = createReactionBench(this.isLight, this.currentConfig);
    this.scene.add(this.reactionHandles.group);
    this.reactionHandles.group.visible = false;

    this.mechanismHandles = createMechanismBench(this.isLight, this.currentConfig);
    this.scene.add(this.mechanismHandles.group);
    this.mechanismHandles.group.visible = false;

    this.instrumentHandles = createInstrumentBench(this.isLight, this.currentConfig);
    this.scene.add(this.instrumentHandles.group);

    // 7. Постобработка (Bloom с высоким порогом, чтобы стол НЕ блумил)
    this.setupPostProcessing(width, height);

    // 8. События
    this.bindEvents();

    // 9. Цикл
    this.tick();
  }

  setupLighting() {
    const cfg = this.currentConfig;

    // Теплый направленный свет (мягкая интенсивность, не пересвечивает)
    this.keyLight = new THREE.DirectionalLight(cfg.keyLightColor, cfg.keyLightIntensity);
    this.keyLight.position.set(4.5, 8.5, 5.5);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 25;
    const d = 6.0;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    // Заполняющий полусферический свет
    this.hemiLight = new THREE.HemisphereLight(cfg.hemiSkyColor, cfg.hemiGroundColor, cfg.hemiIntensity);
    this.hemiLight.position.set(0, 10, 0);
    this.scene.add(this.hemiLight);

    // Контровой холодный синий свет для отделения деталей от фона
    this.rimLight = new THREE.DirectionalLight(cfg.rimColor, cfg.rimIntensity);
    this.rimLight.position.set(-5.5, 4.5, -5.5);
    this.scene.add(this.rimLight);
  }

  setupPostProcessing(width: number, height: number) {
    if (this.isSoftwareGl) return;

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // UnrealBloomPass с порогом 0.94 в светлой теме — светится ТОЛЬКО нить лампы
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      this.currentConfig.bloomIntensity,
      this.currentConfig.bloomRadius,
      this.currentConfig.bloomThreshold
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setQuality(level: QualityLevel) {
    this.quality = level;
    if (level === 'low' || this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.composer = null;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const width = this.container.clientWidth || 640;
      const height = this.container.clientHeight || 480;
      this.setupPostProcessing(width, height);
    }
  }

  setBenchMode(mode: BenchMode) {
    this.mode = mode;
    this.circuitHandles.group.visible = mode === 'circuit';
    this.electronHandles.mesh.visible = mode === 'circuit';
    this.opticsHandles.group.visible = mode === 'optics';
    this.biologyHandles.group.visible = mode === 'biology';
    this.reactionHandles.group.visible = mode === 'reactions';
    this.mechanismHandles.group.visible = mode === 'mechanisms';
  }

  updateCircuit(state: CircuitState) {
    this.circuitHandles.setSwitchState(state.isClosed);
    const ratio = (state.rheostatR - 10) / 90;
    this.circuitHandles.setRheostatRatio(ratio);
    this.circuitHandles.updateLamp(state.current, state.lampPower);
    this.circuitHandles.updateMultimeter(state);
  }

  updateOptics(state: OpticsState) {
    this.opticsHandles.updateOptics(state);
  }

  updateBiology(state: BiologyState) {
    this.biologyHandles.setMagnification(state.magnification);
    this.biologyHandles.setFocusPosition(state.focus);
  }

  updateReactions(state: ReactionState) {
    this.reactionHandles.updateState(state);
  }

  updateMechanisms(state: MechanismState) {
    this.mechanismHandles.updateState(state);
  }

  updateInstruments(instruments: ActiveInstrument[]) {
    this.instrumentHandles.updateInstruments(instruments);
  }

  // Плавное переключение темы (lerp 400 мс)
  updateTheme(isLight: boolean) {
    this.isLight = isLight;
    this.targetConfig = isLight ? {...THEME_PRESETS.light} : {...THEME_PRESETS.dark};
    this.themeLerpTime = 0.0;

    // Мгновенно обновляем текстуры сетки и материалов стола
    this.circuitHandles.updateTheme(this.targetConfig);
    this.opticsHandles.updateTheme(this.targetConfig);
  }

  startFlyToLab() {
    if (this.isFlyingToLab) return;
    this.isFlyingToLab = true;
    this.flyProgress = 0;
    this.flyStartPos.copy(this.camera.position);
    this.flyStartLookAt.copy(this.controls.target);
    this.controls.enabled = false;
  }

  bindEvents() {
    const el = this.renderer.domElement;

    const onPointerMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.targetCameraOffset.x = (e.clientX / window.innerWidth - 0.5) * 0.35;
      this.targetCameraOffset.y = (e.clientY / window.innerHeight - 0.5) * 0.2;

      if (this.isDraggingRheostat && this.callbacks.onRheostatChange) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.85);
        const hitPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(plane, hitPoint)) {
          const localX = hitPoint.x - 2.4;
          const ratio = Math.max(0, Math.min(1, (localX + 1.1) / 2.2));
          const newR = Math.round(10 + ratio * 90);
          this.callbacks.onRheostatChange(newR);
        }
        return;
      }

      if (this.isDraggingLaser && this.callbacks.onLaserAngleChange) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.75);
        const hitPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(plane, hitPoint)) {
          const dx = hitPoint.x - -3.2;
          const dz = hitPoint.z;
          let angleDeg = (Math.atan2(dz, dx) * 180) / Math.PI;
          if (angleDeg < 0) angleDeg = -angleDeg;
          const clamped = Math.max(15, Math.min(60, Math.round(angleDeg)));
          this.callbacks.onLaserAngleChange(clamped);
        }
        return;
      }

      this.checkHover();
    };

    const onPointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const rect = el.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      if (this.mode === 'circuit') {
        const switchHits = this.raycaster.intersectObject(this.circuitHandles.switchGroup, true);
        if (switchHits.length > 0) {
          if (this.callbacks.onSwitchToggle) {
            this.callbacks.onSwitchToggle(true);
          }
          return;
        }

        const rheoHits = this.raycaster.intersectObject(this.circuitHandles.rheostatSlider, true);
        if (rheoHits.length > 0) {
          this.isDraggingRheostat = true;
          this.controls.enabled = false;
          return;
        }

        const meterHits = this.raycaster.intersectObject(this.circuitHandles.interactiveMeshes.multimeter, true);
        if (meterHits.length > 0 && this.callbacks.onMeterModeChange) {
          this.callbacks.onMeterModeChange('V');
          return;
        }
      } else {
        const laserHits = this.raycaster.intersectObject(this.opticsHandles.laserGroup, true);
        if (laserHits.length > 0) {
          this.isDraggingLaser = true;
          this.controls.enabled = false;
          return;
        }
      }
    };

    const onPointerUp = () => {
      if (this.isDraggingRheostat || this.isDraggingLaser) {
        this.isDraggingRheostat = false;
        this.isDraggingLaser = false;
        if (!this.isFlyingToLab) {
          this.controls.enabled = true;
        }
      }
    };

    el.addEventListener('mousemove', onPointerMove);
    el.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);

    const onResize = () => {
      if (this.isDestroyed || !this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w === 0 || h === 0) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      if (this.composer) {
        this.composer.setSize(w, h);
      }
    };
    window.addEventListener('resize', onResize);
  }

  checkHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    let hitItem: InteractiveHitObject | null = null;

    if (this.mode === 'circuit') {
      if (this.raycaster.intersectObject(this.circuitHandles.switchGroup, true).length > 0) {
        hitItem = {
          id: 'switch',
          title: 'Ножевой рубильник',
          hint: 'Кликните для замыкания/размыкания',
        };
      } else if (this.raycaster.intersectObject(this.circuitHandles.rheostatSlider, true).length > 0) {
        hitItem = {
          id: 'rheostat_slider',
          title: 'Ползунок реостата R',
          hint: 'Зажмите и тяните для изменения R',
        };
      } else if (this.raycaster.intersectObject(this.circuitHandles.interactiveMeshes.multimeter, true).length > 0) {
        hitItem = {
          id: 'multimeter',
          title: 'Мультиметр True-RMS',
          hint: 'Кликните для выбора V / A / R',
        };
      } else if (this.raycaster.intersectObject(this.circuitHandles.lampBulbMesh, true).length > 0) {
        hitItem = {
          id: 'lamp',
          title: 'Лампа накаливания 10 Ом',
          hint: 'Светится при замкнутой цепи',
        };
      }
    } else {
      if (this.raycaster.intersectObject(this.opticsHandles.laserGroup, true).length > 0) {
        hitItem = {
          id: 'laser',
          title: 'Лазерный излучатель 532 нм',
          hint: 'Зажмите и поверните для изменения угла',
        };
      }
    }

    if (hitItem?.id !== this.hoveredObject?.id) {
      this.hoveredObject = hitItem;
      this.renderer.domElement.style.cursor = hitItem ? 'pointer' : 'default';
      if (this.callbacks.onHoverObject) {
        this.callbacks.onHoverObject(hitItem);
      }
    }
  }

  tick = () => {
    if (this.isDestroyed) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Плавный lerp 400мс при переключении темы
    if (this.themeLerpTime < 1.0) {
      this.themeLerpTime = Math.min(1.0, this.themeLerpTime + delta / this.lerpDuration);
      const t = this.themeLerpTime;

      // Экспозиция
      this.renderer.toneMappingExposure = THREE.MathUtils.lerp(
        this.currentConfig.exposure,
        this.targetConfig.exposure,
        t
      );

      // Интенсивности света
      this.keyLight.intensity = THREE.MathUtils.lerp(
        this.currentConfig.keyLightIntensity,
        this.targetConfig.keyLightIntensity,
        t
      );
      this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.currentConfig.hemiIntensity,
        this.targetConfig.hemiIntensity,
        t
      );
      this.rimLight.intensity = THREE.MathUtils.lerp(
        this.currentConfig.rimIntensity,
        this.targetConfig.rimIntensity,
        t
      );

      // Bloom параметры
      if (this.bloomPass) {
        this.bloomPass.threshold = THREE.MathUtils.lerp(
          this.currentConfig.bloomThreshold,
          this.targetConfig.bloomThreshold,
          t
        );
        this.bloomPass.strength = THREE.MathUtils.lerp(
          this.currentConfig.bloomIntensity,
          this.targetConfig.bloomIntensity,
          t
        );
        this.bloomPass.radius = THREE.MathUtils.lerp(
          this.currentConfig.bloomRadius,
          this.targetConfig.bloomRadius,
          t
        );
      }

      if (t >= 1.0) {
        this.currentConfig = {...this.targetConfig};
      }
    }

    // Параллакс
    this.currentCameraOffset.x = THREE.MathUtils.damp(
      this.currentCameraOffset.x,
      this.targetCameraOffset.x,
      3,
      delta
    );
    this.currentCameraOffset.y = THREE.MathUtils.damp(
      this.currentCameraOffset.y,
      this.targetCameraOffset.y,
      3,
      delta
    );

    // Полет камеры
    if (this.isFlyingToLab) {
      this.flyProgress += delta * 0.9;
      const t = Math.min(1.0, this.flyProgress);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(this.flyStartPos, this.flyTargetPos, ease);
      this.controls.target.lerpVectors(this.flyStartLookAt, this.flyTargetLookAt, ease);
      this.controls.update();

      if (t >= 1.0) {
        this.isFlyingToLab = false;
        if (this.callbacks.onFlyComplete) {
          this.callbacks.onFlyComplete();
        }
      }
    } else {
      this.controls.update();
    }

    // Электроны
    if (this.mode === 'circuit') {
      const isClosed = (this.circuitHandles.switchBlade.rotation.z || 0) < 0.1;
      const current = isClosed ? 9.0 / (20 + 10) : 0;
      this.electronHandles.update(delta, current, isClosed);
    }

    // Рендер
    if (this.composer && this.quality !== 'low' && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    this.frameId = requestAnimationFrame(this.tick);
  };

  dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);

    this.circuitHandles.dispose();
    this.electronHandles.dispose();
    this.opticsHandles.dispose();
    this.biologyHandles.dispose();
    this.reactionHandles.dispose();
    this.mechanismHandles.dispose();
    this.instrumentHandles.dispose();

    this.controls.dispose();
    this.composer?.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
