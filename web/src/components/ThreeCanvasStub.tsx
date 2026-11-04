/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — ThreeCanvasStub (3D Physics Engine & Workbench)
 * Полноценный 3D физический движок с поддержкой переключения is3DEnabled,
 * активной реакцией на состояние useLabStore и возможностью рендеринга
 * как внутри монтажного стола, так и в корневом компоненте App.
 */

import React, {useEffect, useRef, useState, useCallback} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {
  Activity,
  AlertTriangle,
  Boxes,
  Camera,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import {useLabStore} from '../store/useLabStore.ts';
import {t} from '../../../shared/i18n.ts';
import {CircuitComponent} from '../../../shared/types.ts';
import {useWorkbench3DSync} from '../hooks/useWorkbench3DSync.ts';

export interface ThreeCanvasStubProps {
  labId?: string;
  is3DEnabled?: boolean;
  onToggle3D?: (enabled: boolean) => void;
  onToggleIs3DEnabled?: () => void;
  onClose?: () => void;
  className?: string;
}

export const ThreeCanvasStub: React.FC<ThreeCanvasStubProps> = ({
  labId = 'circuits-dc',
  is3DEnabled: controlledIs3DEnabled,
  onToggle3D,
  onToggleIs3DEnabled,
  onClose,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const {
    language,
    theme,
    components,
    wires,
    simulationResult,
    selectedComponentId,
    activeLabId,
    is3DModeEnabled,
    set3DModeEnabled,
    toggle3DMode,
  } = useLabStore();

  const isLight = theme === 'light';

  // 1. Управление состоянием включения 3D (пропс vs store vs локальное переключение)
  const isEnabled = controlledIs3DEnabled !== undefined ? controlledIs3DEnabled : is3DModeEnabled;

  const handleToggleEnabled = useCallback(
    (nextVal?: boolean) => {
      const targetState = nextVal !== undefined ? nextVal : !isEnabled;
      if (onToggle3D) {
        onToggle3D(targetState);
      }
      if (onToggleIs3DEnabled) {
        onToggleIs3DEnabled();
      }
      set3DModeEnabled(targetState);
    },
    [isEnabled, onToggle3D, onToggleIs3DEnabled, set3DModeEnabled]
  );

  // Режим окна в App: полноэкранный vs плавающий оконный (Picture-in-Picture)
  const isEmbedded = className.includes('w-full') && !className.includes('fixed');
  const [windowMode, setWindowMode] = useState<'pip' | 'fullscreen'>('pip');

  // Состояние пользовательских контроллеров 3D физики
  const [isPhysicsRunning, setIsPhysicsRunning] = useState<boolean>(true);
  const [isGravityOn, setIsGravityOn] = useState<boolean>(true);
  const [isWireSpringsOn, setIsWireSpringsOn] = useState<boolean>(true);
  const [isHudCollapsed, setIsHudCollapsed] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front'>('iso');
  const [hoveredComp, setHoveredComp] = useState<CircuitComponent | null>(null);
  const [draggedCompId, setDraggedCompId] = useState<string | null>(null);

  // Ссылки на Three.js
  const [activeScene, setActiveScene] = useState<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Интеграция с хуком синхронизации 2D -> 3D
  const {
    syncedComponents,
    compHandles,
    stepPhysics,
    dragMove,
    dragRelease,
    resetTo2D,
    shake,
    toggleComponentSwitch,
    selectComp,
    circuitStatus,
  } = useWorkbench3DSync({
    scene: activeScene,
    isLight,
    isPhysicsActive: isPhysicsRunning,
    isGravityEnabled: isGravityOn,
    isWireSpringsEnabled: isWireSpringsOn,
    draggedCompId,
  });

  // Raycasting и плоскость стола для перетаскивания деталей
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mousePosRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const isDraggingRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);

  // 1. Инициализация Three.js сцены, камеры, рендерера и стола
  useEffect(() => {
    if (!isEnabled || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // Сцена
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isLight ? 0xf1f5f9 : 0x090d16);
    scene.fog = new THREE.Fog(isLight ? 0xf1f5f9 : 0x090d16, 18, 45);

    // Камера
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 8.5, 9.5);
    cameraRef.current = camera;

    // Рендерер
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 3.5;
    controls.maxDistance = 22;
    controls.target.set(0, 0.3, 0);

    // Студийное окружение
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Освещение
    const hemiLight = new THREE.HemisphereLight(
      isLight ? 0xffffff : 0x38bdf8,
      isLight ? 0x94a3b8 : 0x0f172a,
      isLight ? 0.9 : 0.6
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    keyLight.position.set(6, 12, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    rimLight.position.set(-6, 7, -6);
    scene.add(rimLight);

    // Монтажный стол
    const tableGroup = new THREE.Group();
    tableGroup.name = 'WorkbenchTable';

    const tableTopGeo = new THREE.BoxGeometry(12.4, 0.5, 8.4);
    const tableTopMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0xe2e8f0 : 0x1e293b,
      roughness: 0.35,
      metalness: 0.1,
    });
    const tableTopMesh = new THREE.Mesh(tableTopGeo, tableTopMat);
    tableTopMesh.position.y = -0.25;
    tableTopMesh.receiveShadow = true;
    tableGroup.add(tableTopMesh);

    // Защитные бортики
    const rimMat = new THREE.MeshStandardMaterial({color: 0x64748b, metalness: 0.8, roughness: 0.25});
    const rimGeoX = new THREE.BoxGeometry(12.6, 0.18, 0.12);
    const rimNorth = new THREE.Mesh(rimGeoX, rimMat);
    rimNorth.position.set(0, 0.08, -4.2);
    const rimSouth = new THREE.Mesh(rimGeoX, rimMat);
    rimSouth.position.set(0, 0.08, 4.2);

    const rimGeoZ = new THREE.BoxGeometry(0.12, 0.18, 8.4);
    const rimWest = new THREE.Mesh(rimGeoZ, rimMat);
    rimWest.position.set(-6.2, 0.08, 0);
    const rimEast = new THREE.Mesh(rimGeoZ, rimMat);
    rimEast.position.set(6.2, 0.08, 0);

    tableGroup.add(rimNorth, rimSouth, rimWest, rimEast);

    // Координатная сетка
    const gridHelper = new THREE.GridHelper(12, 24, isLight ? 0x94a3b8 : 0x38bdf8, isLight ? 0xcbd5e1 : 0x334155);
    gridHelper.position.y = 0.005;
    tableGroup.add(gridHelper);

    // Контактная тень
    const shadowGeo = new THREE.PlaneGeometry(13.5, 9.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: isLight ? 0.2 : 0.45,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.52;
    tableGroup.add(shadowMesh);

    scene.add(tableGroup);

    setActiveScene(scene);

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
      controls.dispose();
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
      setActiveScene(null);
    };
  }, [isEnabled, isLight, labId, activeLabId]);

  // 2. Главный цикл симуляции и рендеринга (активно реагирует на useLabStore)
  useEffect(() => {
    if (!isEnabled || !activeScene) return;

    let lastTime = performance.now();

    const loop = (timeNow: number) => {
      animFrameIdRef.current = requestAnimationFrame(loop);

      const dt = Math.min(0.033, (timeNow - lastTime) / 1000);
      lastTime = timeNow;

      stepPhysics(dt);

      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.render(activeScene, cameraRef.current);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isEnabled, activeScene, stepPhysics]);

  // 3. Обработка кликов и манипуляций мышью
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!mountRef.current || !cameraRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

      const interactiveObjects: THREE.Object3D[] = [];
      compHandles.forEach((h) => interactiveObjects.push(...h.interactiveMeshes));

      const intersects = raycasterRef.current.intersectObjects(interactiveObjects, true);

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.name.startsWith('comp_3d_') && obj.parent) {
          obj = obj.parent;
        }

        if (obj && obj.name.startsWith('comp_3d_')) {
          const compId = obj.name.replace('comp_3d_', '');
          const comp = components.find((c) => c.id === compId);

          if (comp) {
            if (comp.type === 'switch') {
              toggleComponentSwitch(comp.id);
            }

            selectComp(comp.id);
            setDraggedCompId(comp.id);
            isDraggingRef.current = true;

            if (controlsRef.current) controlsRef.current.enabled = false;
          }
        }
      }
    },
    [compHandles, components, selectComp, toggleComponentSwitch]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!mountRef.current || !cameraRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mousePosRef.current.set(x, y);

      raycasterRef.current.setFromCamera(mousePosRef.current, cameraRef.current);

      if (isDraggingRef.current && draggedCompId) {
        const intersectionPoint = new THREE.Vector3();
        if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectionPoint)) {
          dragMove(draggedCompId, intersectionPoint.x, intersectionPoint.z);
        }
        return;
      }

      const interactiveObjects: THREE.Object3D[] = [];
      compHandles.forEach((h) => interactiveObjects.push(...h.interactiveMeshes));
      const intersects = raycasterRef.current.intersectObjects(interactiveObjects, true);

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.name.startsWith('comp_3d_') && obj.parent) {
          obj = obj.parent;
        }
        if (obj && obj.name.startsWith('comp_3d_')) {
          const compId = obj.name.replace('comp_3d_', '');
          const comp = components.find((c) => c.id === compId) || null;
          setHoveredComp(comp);
          if (mountRef.current) mountRef.current.style.cursor = 'grab';
          return;
        }
      }

      setHoveredComp(null);
      if (mountRef.current) mountRef.current.style.cursor = 'default';
    },
    [compHandles, components, dragMove, draggedCompId]
  );

  const handlePointerUp = useCallback(() => {
    if (isDraggingRef.current && draggedCompId) {
      dragRelease(draggedCompId);
      isDraggingRef.current = false;
      setDraggedCompId(null);
      if (controlsRef.current) controlsRef.current.enabled = true;
    }
  }, [dragRelease, draggedCompId]);

  const handleSetCameraPreset = useCallback((preset: 'iso' | 'top' | 'front') => {
    setCameraPreset(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (preset === 'top') {
      camera.position.set(0, 13, 0.1);
      controls.target.set(0, 0, 0);
    } else if (preset === 'front') {
      camera.position.set(0, 3.2, 11);
      controls.target.set(0, 0.6, 0);
    } else {
      camera.position.set(0, 8.5, 9.5);
      controls.target.set(0, 0.3, 0);
    }
  }, []);

  // Если 3D режим выключен: показываем аккуратную плавающую кнопку-триггер для включения
  if (!isEnabled) {
    if (isEmbedded) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 mb-4">
            <Sparkles className="w-8 h-8 text-sky-500 animate-pulse" />
          </div>
          <h3 className="text-base font-semibold mb-2">
            {language === 'tg' ? 'Озмоишгоҳи 3D хомӯш аст' : language === 'ru' ? '3D лаборатория выключена' : '3D Laboratory is Disabled'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            {language === 'tg'
              ? 'Барои дидани ҳамаи унсурҳо дар 3D ва истифодаи муҳаррики физикӣ тугмаи зерро пахш намоед.'
              : 'Включите 3D режим, чтобы симулировать физику твердых тел, гравитацию и натяжение проводов в реальном времени.'}
          </p>
          <button
            onClick={() => handleToggleEnabled(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            <span>{language === 'tg' ? 'Фаъол кардани 3D' : language === 'ru' ? 'Включить 3D сцену' : 'Enable 3D Scene'}</span>
          </button>
        </div>
      );
    }

    return (
      <div className="fixed bottom-4 right-4 z-40 pointer-events-auto">
        <button
          onClick={() => handleToggleEnabled(true)}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-semibold backdrop-blur-xl transition-all shadow-xl hover:scale-105 active:scale-95 ${
            isLight
              ? 'bg-white/95 border-sky-200 text-sky-800 hover:bg-sky-50 shadow-sky-500/15'
              : 'bg-slate-900/95 border-sky-700 text-sky-300 hover:bg-slate-800 shadow-black/50'
          }`}
          title="Включить интерактивную 3D лабораторию"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <span>
            {language === 'tg' ? 'Озмоишгоҳи 3D' : language === 'ru' ? '3D лаборатория' : '3D Workbench'}
          </span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-sky-500/20 text-sky-600 dark:text-sky-300 font-mono">
            {components.length}
          </span>
        </button>
      </div>
    );
  }

  const {isClosed, hasHazard, totalCurrent} = circuitStatus;
  const currentFormatted = isClosed ? totalCurrent.toFixed(2) : '0.00';

  // Обертка: если в App.tsx (не встроен в контейнер), даем окно PiP или Fullscreen
  const containerClasses = isEmbedded
    ? `relative w-full h-full min-h-[480px] overflow-hidden select-none ${
        isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
      } ${className}`
    : windowMode === 'fullscreen'
      ? `fixed inset-0 z-50 w-screen h-screen overflow-hidden select-none ${
          isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
        }`
      : `fixed bottom-4 right-4 z-40 w-[640px] h-[460px] max-w-[94vw] max-h-[85vh] rounded-2xl border shadow-2xl overflow-hidden select-none transition-all duration-200 ${
          isLight
            ? 'bg-white border-slate-300 text-slate-800 shadow-slate-900/20'
            : 'bg-slate-950 border-slate-700 text-slate-100 shadow-black/70'
        } ${className}`;

  return (
    <div className={containerClasses}>
      {/* 1. Верхний информационный бейдж синхронизации */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-auto">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur-md shadow-sm ${
            isLight
              ? 'bg-white/90 border-slate-200 text-slate-700'
              : 'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t('physics3d.title', language)}</span>
          <span className="text-slate-400">|</span>
          <span className="text-sky-600 dark:text-sky-400 font-mono">
            {syncedComponents.length} {language === 'tg' ? 'унсур' : language === 'ru' ? 'дет.' : 'items'}
          </span>
        </div>

        {/* Индикатор электрической цепи */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium backdrop-blur-md shadow-sm ${
            hasHazard
              ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400'
              : isClosed
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
          }`}
        >
          {hasHazard ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{language === 'tg' ? 'Расиши кӯтоҳ!' : 'КЗ!'}</span>
            </>
          ) : isClosed ? (
            <>
              <Zap className="w-3.5 h-3.5" />
              <span>I = {currentFormatted} A</span>
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5 opacity-60" />
              <span>{language === 'tg' ? 'Занҷир кушода' : language === 'ru' ? 'Цепь разомкнута' : 'Loop Open'}</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Ракурсы камеры и управление окном (Top-Right) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 pointer-events-auto">
        <div
          className={`flex items-center p-0.5 rounded-lg border backdrop-blur-md shadow-sm ${
            isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-900/90 border-slate-700'
          }`}
        >
          <button
            onClick={() => handleSetCameraPreset('iso')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
              cameraPreset === 'iso'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50'
            }`}
            title="Изометрия"
          >
            3D
          </button>
          <button
            onClick={() => handleSetCameraPreset('top')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
              cameraPreset === 'top'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50'
            }`}
            title="Вид сверху"
          >
            Top
          </button>
          <button
            onClick={() => handleSetCameraPreset('front')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
              cameraPreset === 'front'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50'
            }`}
            title="Вид спереди"
          >
            Front
          </button>
        </div>

        {/* Переключатель Fullscreen / PiP если в App.tsx */}
        {!isEmbedded && (
          <button
            onClick={() => setWindowMode(windowMode === 'fullscreen' ? 'pip' : 'fullscreen')}
            className={`p-1.5 rounded-lg border backdrop-blur-md transition-all shadow-sm ${
              isLight
                ? 'bg-white/90 border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title={windowMode === 'fullscreen' ? 'Свернуть в окно' : 'На весь экран'}
          >
            {windowMode === 'fullscreen' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}

        {/* Кнопка выключения 3D сцены */}
        <button
          onClick={() => {
            if (onClose) onClose();
            handleToggleEnabled(false);
          }}
          className={`p-1.5 rounded-lg border backdrop-blur-md hover:bg-red-500 hover:text-white transition-all shadow-sm ${
            isLight ? 'bg-white/90 border-slate-200 text-slate-600' : 'bg-slate-900/90 border-slate-700 text-slate-300'
          }`}
          title="Скрыть 3D сцену (выключить is3DEnabled)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Three.js холст */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        aria-label="3D Physics Workbench Viewport"
      />

      {/* 4. Всплывающая подсказка над наведенным компонентом */}
      {hoveredComp && (
        <div className="absolute pointer-events-none z-20 left-1/2 top-14 -translate-x-1/2 px-3 py-1.5 rounded-lg border backdrop-blur-md bg-slate-900/85 text-white text-xs font-medium shadow-lg animate-fade-in flex items-center gap-2">
          <span className="font-semibold text-sky-300">
            {t(`component.${hoveredComp.type}`, language)}
          </span>
          {hoveredComp.type === 'switch' && (
            <span className="text-amber-400">
              ({hoveredComp.state?.isOpen ? (language === 'tg' ? 'Кушода' : 'Разомкнут') : (language === 'tg' ? 'Пӯшида' : 'Замкнут')})
            </span>
          )}
          {hoveredComp.values?.voltage && <span>{hoveredComp.values.voltage}V</span>}
          {hoveredComp.values?.resistance && <span>{hoveredComp.values.resistance}Ω</span>}
          <span className="text-slate-400 text-[10px]">
            {language === 'tg' ? 'Барои кашидан бигиред' : 'Зажмите ЛКМ для перемещения'}
          </span>
        </div>
      )}

      {/* 5. Нижняя панель управления */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-[860px] pointer-events-auto transition-transform duration-300">
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setIsHudCollapsed(!isHudCollapsed)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-md transition-all shadow-sm flex items-center gap-1 ${
              isLight
                ? 'bg-white/95 border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'bg-slate-900/95 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {isHudCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>
              {isHudCollapsed
                ? language === 'tg'
                  ? 'Кушодани панели идоракунӣ'
                  : 'Показать панель 3D физики'
                : language === 'tg'
                  ? 'Пинҳон кардани панел'
                  : 'Свернуть панель'}
            </span>
          </button>
        </div>

        {!isHudCollapsed && (
          <div
            className={`p-2.5 rounded-2xl border backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-2 transition-all ${
              isLight
                ? 'bg-white/95 border-slate-200/90 text-slate-800'
                : 'bg-slate-900/95 border-slate-700/90 text-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsPhysicsRunning((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ${
                  isPhysicsRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title="Запуск / приостановка физической симуляции"
              >
                {isPhysicsRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>
                  {isPhysicsRunning
                    ? t('physics3d.btn.pause', language)
                    : t('physics3d.btn.play', language)}
                </span>
              </button>

              <button
                onClick={() => setIsGravityOn((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all active:scale-95 ${
                  isGravityOn
                    ? isLight
                      ? 'bg-sky-50 border-sky-200 text-sky-700'
                      : 'bg-sky-950/60 border-sky-700 text-sky-300'
                    : isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-500'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="Переключение гравитации"
              >
                <Zap className="w-3.5 h-3.5 text-sky-500" />
                <span>
                  {isGravityOn
                    ? t('physics3d.btn.gravity', language)
                    : t('physics3d.btn.zerog', language)}
                </span>
              </button>

              <button
                onClick={() => setIsWireSpringsOn((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all active:scale-95 ${
                  isWireSpringsOn
                    ? isLight
                      ? 'bg-purple-50 border-purple-200 text-purple-700'
                      : 'bg-purple-950/60 border-purple-700 text-purple-300'
                    : isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-500'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="Упругие связи проводов между деталями"
              >
                <Boxes className="w-3.5 h-3.5 text-purple-500" />
                <span>{t('physics3d.btn.wires', language)}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => shake(3.2)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all active:scale-95 ${
                  isLight
                    ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                    : 'bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/50'
                }`}
                title="Применить кинетический импульс ко всем деталям"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('physics3d.btn.shake', language)}</span>
              </button>

              <button
                onClick={resetTo2D}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all active:scale-95 ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
                title="Вернуть детали на позиции 2D стола"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('physics3d.btn.reset', language)}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
