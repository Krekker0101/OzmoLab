/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Полнофункциональный 3D Движок Монтажного Стола
 * Полная синхронизация с 2D схемой: компоненты, провода, токи, приборы, реакции и механизмы.
 */

import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {CircuitComponent, SimulationResult, Wire} from '../../../../../shared/types.ts';
import {createComponent3DMesh, ComponentMeshHandle} from './WorkbenchComponentMeshes.ts';
import {createWorkbenchWireSystem, WireMeshHandle} from './WorkbenchWireMeshes.ts';
import {createReactionBench, ReactionModelHandles} from '../models/ReactionModels.ts';
import {createMechanismBench, MechanismModelHandles} from '../models/MechanismModels.ts';
import {createInstrumentBench, InstrumentModelHandles} from '../models/InstrumentModels.ts';
import {ActiveInstrument, MechanismState, ReactionState} from '../types.ts';

// Преобразование координат 2D SVG (0..1200, 0..800) <-> 3D Table (-6..+6, -4..+4)
export function map2DTo3D(x: number, y: number): {x: number; z: number} {
  const normX = (x - 600) / 600;
  const normY = (y - 400) / 400;
  return {
    x: normX * 5.6,
    z: normY * 3.8,
  };
}

export function map3DTo2D(x3d: number, z3d: number): {x: number; y: number} {
  const normX = x3d / 5.6;
  const normY = z3d / 3.8;
  return {
    x: Math.round(600 + normX * 600),
    y: Math.round(400 + normY * 400),
  };
}

export interface Workbench3DCallbacks {
  onToggleSwitch?: (componentId: string) => void;
  onSelectComponent?: (componentId: string | null) => void;
  onMoveComponent?: (componentId: string, x2d: number, y2d: number) => void;
  onHoverComponent?: (comp: CircuitComponent | null) => void;
}

export class Workbench3DSceneManager {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;

  isLight: boolean;
  callbacks: Workbench3DCallbacks;

  // Освещение
  dirLight!: THREE.DirectionalLight;
  hemiLight!: THREE.HemisphereLight;
  tableMesh!: THREE.Mesh;

  // Коллекции мешей
  componentMeshes = new Map<string, {handle: ComponentMeshHandle; comp: CircuitComponent}>();
  wireSystem: WireMeshHandle;

  // Лабораторные блоки расширения
  reactionBench: ReactionModelHandles;
  mechanismBench: MechanismModelHandles;
  instrumentBench: InstrumentModelHandles;

  // Взаимодействие и рейкастинг
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2(-100, -100);
  draggingComponentId: string | null = null;
  dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  hoveredComponentId: string | null = null;

  // Анимация
  clock = new THREE.Clock();
  frameId = 0;
  isDestroyed = false;

  constructor(container: HTMLElement, isLight: boolean, callbacks: Workbench3DCallbacks) {
    this.container = container;
    this.isLight = isLight;
    this.callbacks = callbacks;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 600;

    // 1. Рендерер с поддержкой ACESFilmic и мягких теней
    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'high-performance'});
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = isLight ? 0.95 : 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 2. Сцена и камера
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 7.8, 10.2);

    // 3. Управление камерой OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 18.0;
    this.controls.target.set(0, 0.3, 0);
    this.controls.update();

    // 4. Окружение RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 5. Освещение и монтажный стол
    this.setupLighting();
    this.setupTable();

    // 6. Системы проводов и спец-станций
    this.wireSystem = createWorkbenchWireSystem();
    this.scene.add(this.wireSystem.group);

    this.reactionBench = createReactionBench(isLight);
    this.reactionBench.group.position.set(-3.6, 0.05, -2.4);
    this.reactionBench.group.visible = false;
    this.scene.add(this.reactionBench.group);

    this.mechanismBench = createMechanismBench(isLight);
    this.mechanismBench.group.position.set(3.4, 0.05, -2.2);
    this.mechanismBench.group.visible = false;
    this.scene.add(this.mechanismBench.group);

    this.instrumentBench = createInstrumentBench(isLight);
    this.scene.add(this.instrumentBench.group);

    // 7. Подключение событий
    this.bindEvents();

    // 8. Запуск цикла
    this.tick();
  }

  setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(
      this.isLight ? 0xe2e8f0 : 0x38bdf8,
      this.isLight ? 0x94a3b8 : 0x090d16,
      this.isLight ? 0.75 : 0.85
    );
    this.hemiLight.position.set(0, 10, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, this.isLight ? 1.6 : 2.2);
    this.dirLight.position.set(5.0, 10.0, 6.0);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 30;
    const d = 8.5;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0003;
    this.scene.add(this.dirLight);

    // Контровой свет
    const rim = new THREE.DirectionalLight(0x38bdf8, this.isLight ? 0.8 : 1.4);
    rim.position.set(-6, 5, -6);
    this.scene.add(rim);
  }

  setupTable() {
    // Столешница лаборатории с координатной сеткой
    const tableGeo = new THREE.BoxGeometry(13.6, 0.2, 9.4);
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = this.isLight ? '#cbd5e1' : '#0d131f';
      ctx.fillRect(0, 0, 1024, 1024);

      // Сетка 32px
      ctx.strokeStyle = this.isLight ? 'rgba(30, 48, 80, 0.18)' : 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 1024; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
      }
      for (let y = 0; y <= 1024; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }

      // Главные линии
      ctx.strokeStyle = this.isLight ? 'rgba(15, 23, 42, 0.35)' : 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= 1024; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
      }
      for (let y = 0; y <= 1024; y += 128) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }

      ctx.fillStyle = this.isLight ? '#334155' : '#38bdf8';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('OZMO LAB • 3D WORKBENCH MATRIX', 40, 50);
      ctx.font = '14px monospace';
      ctx.fillText('CALIBRATED SCIENTIFIC BENCH • METRIC GRID 50MM', 40, 80);
    }

    const tableTex = new THREE.CanvasTexture(canvas);
    tableTex.colorSpace = THREE.SRGBColorSpace;

    const tableMat = new THREE.MeshStandardMaterial({
      map: tableTex,
      roughness: 0.5,
      metalness: 0.1,
    });

    this.tableMesh = new THREE.Mesh(tableGeo, tableMat);
    this.tableMesh.position.y = -0.1;
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);
  }

  // Синхронизация компонентов с состоянием 2D монтажного стола
  syncComponents(components: CircuitComponent[], simResult: SimulationResult | null, selectedId: string | null) {
    const activeIds = new Set(components.map((c) => c.id));

    // Удаляем убранные компоненты
    for (const [id, item] of this.componentMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(item.handle.group);
        item.handle.dispose();
        this.componentMeshes.delete(id);
      }
    }

    // Создаем или обновляем компоненты
    components.forEach((comp) => {
      let entry = this.componentMeshes.get(comp.id);
      if (!entry) {
        const handle = createComponent3DMesh(comp, this.isLight);
        this.scene.add(handle.group);
        entry = {handle, comp};
        this.componentMeshes.set(comp.id, entry);
      }

      // Позиция на столе
      const pos3d = map2DTo3D(comp.x, comp.y);
      entry.handle.group.position.set(pos3d.x, 0, pos3d.z);
      entry.handle.group.rotation.y = -((comp.rotation || 0) * Math.PI) / 180;

      // Обновление состояния (лампа светится, нож рубильника открыт/закрыт)
      entry.handle.updateState(comp, simResult, this.clock.getElapsedTime());

      // Подсветка выбранного компонента
      const isSelected = comp.id === selectedId;
      if (isSelected) {
        entry.handle.group.scale.setScalar(1.05);
      } else {
        entry.handle.group.scale.setScalar(1.0);
      }

      entry.comp = comp;
    });

    // Собираем мировые координаты клемм для проводов
    this.updateWiresInternal();
  }

  // Расчет мировых координат клемм каждого компонента
  getTerminalWorldCoordinates(): Map<string, THREE.Vector3> {
    const coords = new Map<string, THREE.Vector3>();
    for (const [compId, item] of this.componentMeshes) {
      const group = item.handle.group;
      group.updateMatrixWorld(true);

      for (const [termId, localVec] of item.handle.terminals) {
        const worldVec = localVec.clone().applyMatrix4(group.matrixWorld);
        coords.set(`${compId}:${termId}`, worldVec);
      }
    }
    return coords;
  }

  currentWires: Wire[] = [];

  syncWires(wires: Wire[]) {
    this.currentWires = wires;
    this.updateWiresInternal();
  }

  updateWiresInternal() {
    const terminalCoords = this.getTerminalWorldCoordinates();
    this.wireSystem.updateWires(this.currentWires, terminalCoords, 0.016);
  }

  // Станции реакций и механизмов
  setReactionsVisible(visible: boolean) {
    this.reactionBench.group.visible = visible;
  }

  updateReactionState(state: ReactionState) {
    this.reactionBench.updateState(state);
  }

  setMechanismsVisible(visible: boolean) {
    this.mechanismBench.group.visible = visible;
  }

  updateMechanismState(state: MechanismState) {
    this.mechanismBench.updateState(state);
  }

  updateInstruments(instruments: ActiveInstrument[]) {
    this.instrumentBench.updateInstruments(instruments);
  }

  // Переключение ракурсов камеры
  setCameraPreset(preset: 'top' | 'iso' | 'front') {
    if (preset === 'top') {
      this.camera.position.set(0, 14.0, 0.01);
      this.controls.target.set(0, 0, 0);
    } else if (preset === 'iso') {
      this.camera.position.set(0, 7.8, 10.2);
      this.controls.target.set(0, 0.3, 0);
    } else {
      this.camera.position.set(0, 3.2, 11.5);
      this.controls.target.set(0, 0.6, 0);
    }
    this.controls.update();
  }

  bindEvents() {
    const el = this.renderer.domElement;

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Перетаскивание компонента в 3D плоскости стола
      if (this.draggingComponentId) {
        const hitPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, hitPoint)) {
          // Ограничиваем пределы стола
          hitPoint.x = Math.max(-5.5, Math.min(5.5, hitPoint.x));
          hitPoint.z = Math.max(-3.8, Math.min(3.8, hitPoint.z));

          const compEntry = this.componentMeshes.get(this.draggingComponentId);
          if (compEntry) {
            compEntry.handle.group.position.x = hitPoint.x;
            compEntry.handle.group.position.z = hitPoint.z;
            this.updateWiresInternal();

            const p2d = map3DTo2D(hitPoint.x, hitPoint.z);
            if (this.callbacks.onMoveComponent) {
              this.callbacks.onMoveComponent(this.draggingComponentId, p2d.x, p2d.y);
            }
          }
        }
        return;
      }

      // Проверка наведения курсора
      let hovered: CircuitComponent | null = null;
      for (const [id, item] of this.componentMeshes) {
        const hits = this.raycaster.intersectObjects(item.handle.group.children, true);
        if (hits.length > 0) {
          hovered = item.comp;
          this.hoveredComponentId = id;
          break;
        }
      }

      if (!hovered) this.hoveredComponentId = null;
      el.style.cursor = hovered ? 'pointer' : 'default';
      if (this.callbacks.onHoverComponent) {
        this.callbacks.onHoverComponent(hovered);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType !== 'touch') return;
      el.setPointerCapture(e.pointerId);
      this.raycaster.setFromCamera(this.mouse, this.camera);

      for (const [id, item] of this.componentMeshes) {
        const hits = this.raycaster.intersectObjects(item.handle.group.children, true);
        if (hits.length > 0) {
          // Клик по рубильнику переключает его
          if (item.comp.type === 'switch' && this.callbacks.onToggleSwitch) {
            this.callbacks.onToggleSwitch(id);
          }

          if (this.callbacks.onSelectComponent) {
            this.callbacks.onSelectComponent(id);
          }

          // Начинаем перетаскивание
          this.draggingComponentId = id;
          this.controls.enabled = false;
          return;
        }
      }

      // Клик в пустое место
      if (this.callbacks.onSelectComponent) {
        this.callbacks.onSelectComponent(null);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (this.draggingComponentId) {
        this.draggingComponentId = null;
        this.controls.enabled = true;
      }
    };

    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    const onResize = () => {
      if (this.isDestroyed || !this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w === 0 || h === 0) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    el.style.touchAction = 'none';
  }

  tick = () => {
    if (this.isDestroyed) return;

    const delta = this.clock.getDelta();
    this.controls.update();

    // Обновление проводов и электронов
    this.updateWiresInternal();

    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.tick);
  };

  dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);

    for (const [, item] of this.componentMeshes) {
      item.handle.dispose();
    }
    this.componentMeshes.clear();

    this.wireSystem.dispose();
    this.reactionBench.dispose();
    this.mechanismBench.dispose();
    this.instrumentBench.dispose();

    this.controls.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
