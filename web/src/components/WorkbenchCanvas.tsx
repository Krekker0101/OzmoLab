/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Центральная рабочая область (2D SVG Монтажный стол & 3D Лаборатория)
 */

import React, {useState, useRef, useMemo, useEffect} from 'react';
import {
  Activity,
  Boxes,
  Bot,
  Grid,
  Magnet,
  Maximize2,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
  FolderOpen,
  RotateCw,
  Undo2,
  Redo2,
  Compass,
  Ruler as RulerIcon,
  Eye,
  BookOpen,
  Atom,
  ArrowDown,
  Waves,
  Link,
  Zap,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {useLabStore} from '../store/useLabStore.ts';
import {t} from '../../../shared/i18n.ts';
import {TerminalRef} from '../../../shared/types.ts';
import {Workbench3DView} from './hero3d/workbench3d/Workbench3DView.tsx';
import {ThreeCanvasStub} from './ThreeCanvasStub.tsx';
import {useWorkbenchPhysics} from '../hooks/useWorkbenchPhysics.ts';
import {
  formatVoltage,
  formatResistance,
  formatCurrent,
  formatPower,
} from '../store/circuitPhysicsUtility.ts';

const GRID_SIZE = 20;
const CARD_WIDTH = 164;
const CARD_HEIGHT = 96;

function computeOrthogonalPath(p1: {x: number; y: number}, p2: {x: number; y: number}): string {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (Math.abs(dx) < 20 || Math.abs(dy) < 20) {
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  }
  const midX = Math.round(p1.x + dx * 0.5);
  return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
}

export const WorkbenchCanvas: React.FC = () => {
  const {
    language,
    theme,
    activeLab,
    components,
    wires,
    activeConnectingTerminal,
    simulationResult,
    circuitPhysics,
    selectedComponentId,
    historyPast,
    historyFuture,
    showRuler,
    showProtractor,
    rulerPos,
    protractorPos,
    isEyepieceOpen,
    eyepieceSettings,
    setTutorOpen,
    startConnectingTerminal,
    finishConnectingTerminal,
    cancelConnecting,
    addComponent,
    removeComponent,
    rotateComponent,
    removeWire,
    updateComponentPosition,
    updateComponentValue,
    toggleSwitch,
    selectComponent,
    clearWorkbench,
    loadPreset,
    runSimulation,
    undo,
    redo,
    toggleRuler,
    toggleProtractor,
    setRulerPos,
    setProtractorPos,
    setEyepieceOpen,
    updateEyepieceSettings,
  } = useLabStore();

  const isLight = theme === 'light';
  const svgRef = useRef<SVGSVGElement>(null);
  const [mousePos, setMousePos] = useState<{x: number; y: number}>({x: 0, y: 0});
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{x: number; y: number}>({x: 0, y: 0});
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isSnapEnabled, setIsSnapEnabled] = useState<boolean>(true);
  const [benchView, setBenchView] = useState<'2d' | '3d' | '3d-physics'>('2d');
  const [showProtocolModal, setShowProtocolModal] = useState<boolean>(false);

  // Физический движок Matter.js
  const [canvasDimensions, setCanvasDimensions] = useState<{width: number; height: number}>({
    width: 1200,
    height: 800,
  });

  const {
    isPhysicsActive,
    togglePhysics,
    isGravityEnabled,
    toggleGravity,
    wireTethersEnabled,
    toggleWireTethers,
    shakeWorkbench,
    onDragMove,
  } = useWorkbenchPhysics({
    containerWidth: canvasDimensions.width,
    containerHeight: canvasDimensions.height,
    draggingCompId,
  });

  useEffect(() => {
    if (!svgRef.current) return;
    const updateSize = () => {
      if (svgRef.current) {
        setCanvasDimensions({
          width: svgRef.current.clientWidth || 1200,
          height: svgRef.current.clientHeight || 800,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Состояние перетаскивания линейки и транспортира
  const [draggingTool, setDraggingTool] = useState<'ruler' | 'protractor' | null>(null);
  const [toolDragOffset, setToolDragOffset] = useState<{x: number; y: number}>({x: 0, y: 0});

  // Горячие клавиши (Delete, Ctrl+Z, Ctrl+Y, R, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentId) {
          e.preventDefault();
          removeComponent(selectedComponentId);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedComponentId) {
          e.preventDefault();
          rotateComponent(selectedComponentId);
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        runSimulation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentId, removeComponent, rotateComponent, undo, redo, runSimulation]);

  // Преобразование относительных координат терминалов с учётом угла вращения
  const terminalCoordinates = useMemo(() => {
    const coords = new Map<string, {x: number; y: number}>();
    components.forEach((comp) => {
      const cx = comp.x + CARD_WIDTH / 2;
      const cy = comp.y + CARD_HEIGHT / 2;
      const rad = ((comp.rotation || 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const rotatePoint = (localX: number, localY: number) => {
        const dx = localX - CARD_WIDTH / 2;
        const dy = localY - CARD_HEIGHT / 2;
        return {
          x: Math.round(cx + dx * cos - dy * sin),
          y: Math.round(cy + dx * sin + dy * cos),
        };
      };

      if (comp.type === 'battery') {
        coords.set(`${comp.id}:neg`, rotatePoint(14, 50));
        coords.set(`${comp.id}:pos`, rotatePoint(CARD_WIDTH - 14, 50));
      } else if (comp.type === 'laser_source') {
        coords.set(`${comp.id}:beam_out`, rotatePoint(CARD_WIDTH - 14, 50));
      } else if (comp.type === 'convex_lens' || comp.type === 'concave_lens') {
        coords.set(`${comp.id}:surface_in`, rotatePoint(14, 50));
        coords.set(`${comp.id}:surface_out`, rotatePoint(CARD_WIDTH - 14, 50));
      } else if (comp.type === 'optical_screen') {
        coords.set(`${comp.id}:sensor`, rotatePoint(14, 50));
      } else if (comp.type === 'microscope') {
        coords.set(`${comp.id}:stage`, rotatePoint(CARD_WIDTH / 2, 70));
      } else if (comp.type === 'slide_sample') {
        coords.set(`${comp.id}:mount`, rotatePoint(CARD_WIDTH / 2, 70));
      } else {
        coords.set(`${comp.id}:term_a`, rotatePoint(14, 50));
        coords.set(`${comp.id}:term_b`, rotatePoint(CARD_WIDTH - 14, 50));
      }
    });
    return coords;
  }, [components]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({x, y});

    if (draggingCompId) {
      const rawX = x - dragOffset.x;
      const rawY = y - dragOffset.y;
      const targetX = isSnapEnabled ? Math.round(rawX / GRID_SIZE) * GRID_SIZE : rawX;
      const targetY = isSnapEnabled ? Math.round(rawY / GRID_SIZE) * GRID_SIZE : rawY;

      const boundedX = Math.max(10, Math.min(rect.width - CARD_WIDTH - 10, targetX));
      const boundedY = Math.max(10, Math.min(rect.height - CARD_HEIGHT - 10, targetY));

      updateComponentPosition(draggingCompId, boundedX, boundedY);

      if (isPhysicsActive) {
        onDragMove(draggingCompId, boundedX, boundedY);
      }
    } else if (draggingTool === 'ruler') {
      setRulerPos({
        x: Math.max(10, Math.min(rect.width - 240, x - toolDragOffset.x)),
        y: Math.max(10, Math.min(rect.height - 80, y - toolDragOffset.y)),
      });
    } else if (draggingTool === 'protractor') {
      setProtractorPos({
        x: Math.max(10, Math.min(rect.width - 200, x - toolDragOffset.x)),
        y: Math.max(10, Math.min(rect.height - 200, y - toolDragOffset.y)),
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingCompId(null);
    setDraggingTool(null);
  };

  const handleComponentMouseDown = (
    e: React.MouseEvent,
    compId: string,
    compX: number,
    compY: number
  ) => {
    e.stopPropagation();
    selectComponent(compId);
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    setDragOffset({x: clickX - compX, y: clickY - compY});
    setDraggingCompId(compId);
  };

  const handleTerminalClick = (e: React.MouseEvent, compId: string, terminalId: string) => {
    e.stopPropagation();
    const clickedRef: TerminalRef = {componentId: compId, terminalId};

    if (!activeConnectingTerminal) {
      startConnectingTerminal(clickedRef);
    } else {
      finishConnectingTerminal(clickedRef);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!svgRef.current) return;

    const compType = e.dataTransfer.getData('application/ozmo-component-type');
    if (!compType) return;

    const rect = svgRef.current.getBoundingClientRect();
    const dropX = e.clientX - rect.left - CARD_WIDTH / 2;
    const dropY = e.clientY - rect.top - CARD_HEIGHT / 2;

    const targetX = isSnapEnabled ? Math.round(dropX / GRID_SIZE) * GRID_SIZE : dropX;
    const targetY = isSnapEnabled ? Math.round(dropY / GRID_SIZE) * GRID_SIZE : dropY;

    addComponent(
      compType,
      Math.max(10, Math.min(rect.width - CARD_WIDTH - 10, targetX)),
      Math.max(10, Math.min(rect.height - CARD_HEIGHT - 10, targetY))
    );
  };

  const activeTerminalPos = useMemo(() => {
    if (!activeConnectingTerminal) return null;
    return terminalCoordinates.get(
      `${activeConnectingTerminal.componentId}:${activeConnectingTerminal.terminalId}`
    );
  }, [activeConnectingTerminal, terminalCoordinates]);

  const laserComp = components.find((c) => c.type === 'laser_source');
  const lensComp = components.find((c) => c.type === 'convex_lens' || c.type === 'concave_lens');
  const screenComp = components.find((c) => c.type === 'optical_screen');
  const isBranchConducting = Boolean(simulationResult?.isClosedCircuit);
  const discipline = activeLab.discipline || 'circuits';

  // Расчет фокуса для окуляра (наилучшая резкость при ~85%)
  const focusBlurPx = Math.max(0, Math.abs(eyepieceSettings.focus - 85) * 0.16);
  const isSharpFocus = focusBlurPx < 1.2;

  return (
    <main
      className={`relative flex-1 flex flex-col overflow-hidden select-none transition-colors duration-200 ${
        isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Верхняя панель управления монтажным столом */}
      <header
        className={`h-12 border-b flex items-center justify-between px-4 z-20 shrink-0 ${
          isLight ? 'bg-white/95 border-slate-200/90 shadow-2xs' : 'bg-slate-900/95 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <h2
            className={`text-xs font-bold uppercase tracking-wider ${
              isLight ? 'text-slate-800' : 'text-slate-200'
            }`}
          >
            {t('workbench.title', language)}
          </h2>

          <div
            className={`h-4 w-px ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}
            role="separator"
          />

          {/* Переключатель 2D / 3D представления */}
          <div
            className={`flex items-center rounded-lg p-0.5 border ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
            }`}
          >
            <button
              onClick={() => setBenchView('2d')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                benchView === '2d'
                  ? isLight
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'bg-slate-700 text-sky-300 shadow-sm'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('workbench.tab.2d', language)}
            </button>
            <button
              onClick={() => setBenchView('3d')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                benchView === '3d'
                  ? isLight
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'bg-slate-700 text-sky-300 shadow-sm'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('workbench.tab.3d', language)}</span>
            </button>
            <button
              onClick={() => setBenchView('3d-physics')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                benchView === '3d-physics'
                  ? isLight
                    ? 'bg-white text-purple-700 shadow-2xs'
                    : 'bg-slate-700 text-purple-300 shadow-sm'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-purple-500" />
              <span>{t('workbench.tab.3d_physics', language)}</span>
            </button>
          </div>

          {/* Загрузить пример (Preset) */}
          <button
            onClick={loadPreset}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 active:scale-95 ${
              isLight
                ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 shadow-2xs'
                : 'bg-sky-950/60 text-sky-300 border-sky-800 hover:bg-sky-900/60'
            }`}
            title={language === 'en' ? 'Load a sample circuit for this laboratory' : 'Загрузить пример схемы для этой лаборатории'}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>{t('workbench.btn.load_preset', language)}</span>
          </button>
        </div>

        {/* Инструменты отмены, вращения, сетки и запуска */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center gap-1 border-r pr-2 border-slate-200 dark:border-slate-800">
            <button
              onClick={undo}
              disabled={historyPast.length === 0}
              className={`p-1.5 rounded-lg border transition-all disabled:opacity-40 active:scale-95 ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={t('hotkey.undo', language)}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={redo}
              disabled={historyFuture.length === 0}
              className={`p-1.5 rounded-lg border transition-all disabled:opacity-40 active:scale-95 ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={t('hotkey.redo', language)}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            {/* Вращение выбранного компонента */}
            <button
              onClick={() => selectedComponentId && rotateComponent(selectedComponentId)}
              disabled={!selectedComponentId}
              className={`p-1.5 rounded-lg border transition-all disabled:opacity-40 active:scale-95 ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={t('hotkey.rotate', language)}
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Инструменты лаборатории оптики (Линейка и Транспортир) */}
          {discipline === 'optics' && (
            <div className="flex items-center gap-1 border-r pr-2 border-slate-200 dark:border-slate-800">
              <button
                onClick={toggleRuler}
                className={`p-1.5 rounded-lg border transition-all active:scale-95 ${
                  showRuler
                    ? isLight
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-amber-900/60 text-amber-300 border-amber-700'
                    : isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={t('tools.ruler', language)}
              >
                <RulerIcon className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={toggleProtractor}
                className={`p-1.5 rounded-lg border transition-all active:scale-95 ${
                  showProtractor
                    ? isLight
                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                      : 'bg-sky-900/60 text-sky-300 border-sky-700'
                    : isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={t('tools.protractor', language)}
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Инструменты лаборатории биологии (Окуляр и Протокол) */}
          {discipline === 'biology' && (
            <div className="flex items-center gap-1 border-r pr-2 border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setEyepieceOpen(true)}
                className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                }`}
                title={t('tools.eyepiece', language)}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t('tools.eyepiece', language)}</span>
              </button>

              <button
                onClick={() => setShowProtocolModal(true)}
                className={`p-1.5 rounded-lg border transition-all active:scale-95 ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={t('tools.protocol', language)}
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Инструменты физического движка Matter.js */}
          <div className="flex items-center gap-1 border-r pr-2 border-slate-200 dark:border-slate-800">
            <button
              onClick={togglePhysics}
              className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                isPhysicsActive
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={t('workbench.btn.physics', language)}
            >
              <Atom className={`w-3.5 h-3.5 ${isPhysicsActive ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Matter.js</span>
            </button>

            {isPhysicsActive && (
              <>
                <button
                  onClick={toggleGravity}
                  className={`p-1.5 rounded-lg border transition-all active:scale-95 ${
                    isGravityEnabled
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title={`${t('workbench.btn.gravity', language)} (${isGravityEnabled ? '9.8 m/s²' : '0g'})`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => shakeWorkbench(0.12)}
                  className={`p-1.5 rounded-lg border transition-all active:scale-95 ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title={t('workbench.btn.shake', language)}
                >
                  <Waves className="w-3.5 h-3.5 text-amber-500" />
                </button>

                <button
                  onClick={toggleWireTethers}
                  className={`p-1.5 rounded-lg border transition-all active:scale-95 ${
                    wireTethersEnabled
                      ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                      : isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title={t('workbench.btn.tether', language)}
                >
                  <Link className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Привязка к сетке */}
          <button
            onClick={() => setIsSnapEnabled(!isSnapEnabled)}
            className={`p-1.5 rounded-lg border transition-all ${
              isSnapEnabled
                ? isLight
                  ? 'bg-sky-100 text-sky-700 border-sky-200'
                  : 'bg-sky-900/60 text-sky-400 border-sky-800'
                : isLight
                  ? 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
            }`}
            title={t('workbench.snap_tooltip', language)}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          {/* Отображение сетки */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg border transition-all ${
              showGrid
                ? isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
                : isLight
                  ? 'bg-white text-slate-400 border-slate-200'
                  : 'bg-slate-900 text-slate-600 border-slate-800'
            }`}
            title={t('workbench.grid', language)}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Очистить стол */}
          <button
            onClick={clearWorkbench}
            className={`p-1.5 rounded-lg border transition-all ${
              isLight
                ? 'bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200 hover:border-rose-200'
                : 'bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border-slate-700'
            }`}
            title={t('workbench.btn.clear', language)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Кнопка запуска расчета */}
          <button
            onClick={runSimulation}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title={language === 'en' ? 'Run the physics calculation (Space)' : 'Запустить расчет физических законов (Space)'}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('workbench.btn.run', language)}</span>
          </button>
        </div>
      </header>

      {/* Центральный вид: либо 3D лаборатория, либо 3D физический движок ThreeCanvasStub, либо 2D интерактивный SVG стол */}
      {benchView === '3d' ? (
        <div className="flex-1 w-full h-full relative">
          <Workbench3DView />
        </div>
      ) : benchView === '3d-physics' ? (
        <div className="flex-1 w-full h-full relative">
          <ThreeCanvasStub labId={activeLab.id} is3DEnabled={true} />
        </div>
      ) : (
        <div
          className={`flex-1 relative overflow-hidden transition-colors ${
            isDragOver ? (isLight ? 'bg-sky-50/50 ring-2 ring-sky-500 inset-0' : 'bg-sky-950/20 ring-2 ring-sky-500') : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (activeConnectingTerminal) cancelConnecting();
            selectComponent(null);
          }}
        >
          {/* Индикатор протягивания соединительного провода */}
          {activeConnectingTerminal && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium border shadow-md animate-pulse flex items-center gap-2 ${
                  isLight
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-amber-900/80 text-amber-200 border-amber-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{t('workbench.connecting', language)}</span>
              </div>
            </div>
          )}

          {/* ПАНЕЛЬ ФИЗИЧЕСКИХ ПОКАЗАТЕЛЕЙ ЦЕПИ (CIRCUIT PHYSICS OUTPUT BAR) */}
          {activeLab.id === 'circuits-dc' && circuitPhysics && components.length > 0 && (
            <div className="absolute top-2.5 left-3 right-3 z-20 pointer-events-auto">
              <div
                className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-md text-xs transition-all ${
                  isLight
                    ? 'bg-white/95 border-slate-200 text-slate-800'
                    : 'bg-slate-900/95 border-slate-700/80 text-slate-100'
                }`}
              >
                {/* Левая часть: статус цепи и подключение */}
                <div className="flex items-center gap-2">
                  {circuitPhysics.hasShortCircuit ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-xs bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      {t('physics.status.short_circuit', language)}
                    </span>
                  ) : circuitPhysics.isClosedCircuit ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <Zap className="w-3.5 h-3.5 text-emerald-500 fill-current" />
                      {t('physics.status.closed', language)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      {t('physics.status.open', language)}
                    </span>
                  )}

                  {/* Счётчик подключенных элементов */}
                  <span className="hidden sm:inline text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {circuitPhysics.connectedComponentsCount}/{components.length} {t('physics.connected_count', language)}
                  </span>
                </div>

                {/* Центр: физические величины U, R, I, P */}
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  {/* U total */}
                  <div className="flex items-center gap-1" title={t('physics.output.voltage', language)}>
                    <span className="text-slate-400 font-sans">U:</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {formatVoltage(circuitPhysics.totalVoltage)}
                    </span>
                  </div>

                  {/* R eq */}
                  <div className="flex items-center gap-1" title={t('physics.output.resistance', language)}>
                    <span className="text-slate-400 font-sans">R:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {formatResistance(circuitPhysics.equivalentResistance)}
                    </span>
                  </div>

                  {/* I total */}
                  <div className="flex items-center gap-1" title={t('physics.output.current', language)}>
                    <span className="text-slate-400 font-sans">I:</span>
                    <span
                      className={`font-bold ${
                        circuitPhysics.isClosedCircuit
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {formatCurrent(circuitPhysics.totalCurrent)}
                    </span>
                  </div>

                  {/* P total */}
                  <div className="hidden md:flex items-center gap-1" title={t('physics.output.power', language)}>
                    <span className="text-slate-400 font-sans">P:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {formatPower(circuitPhysics.totalPower)}
                    </span>
                  </div>
                </div>

                {/* Правая часть: проверка закона Ома */}
                <div
                  className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  title={language === 'en' ? "Calculate using Ohm's law for the complete circuit" : 'Расчёт по закону Ома для полной цепи'}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{circuitPhysics.ohmsLaw.formula}</span>
                </div>
              </div>
            </div>
          )}

          {/* SVG МОНТАЖНЫЙ ХОЛСТ */}
          <svg
            ref={svgRef}
            className="w-full h-full cursor-default"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <defs>
              {/* Шаблон сетки координатного стола */}
              <pattern id="gridPattern" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                <circle
                  cx={GRID_SIZE / 2}
                  cy={GRID_SIZE / 2}
                  r="1"
                  fill={isLight ? '#cbd5e1' : '#334155'}
                />
              </pattern>

              {/* Свечение лампы */}
              <radialGradient id="lampGlow">
                <stop offset="0%" stopColor="#fde047" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#facc15" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Подложка координатной сетки */}
            {showGrid && <rect width="100%" height="100%" fill="url(#gridPattern)" />}

            {/* Пустое состояние */}
            {components.length === 0 && (
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                className={`text-xs select-none font-medium ${
                  isLight ? 'fill-slate-400' : 'fill-slate-600'
                }`}
              >
                {t('workbench.empty', language)}
              </text>
            )}

            {/* Оптический луч света между лазером, линзой и экраном */}
            {laserComp && (
              <g className="pointer-events-none">
                {lensComp && (
                  <line
                    x1={laserComp.x + CARD_WIDTH - 14}
                    y1={laserComp.y + 50}
                    x2={lensComp.x + 14}
                    y2={lensComp.y + 50}
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                )}
                {lensComp && screenComp && (
                  <line
                    x1={lensComp.x + CARD_WIDTH - 14}
                    y1={lensComp.y + 50}
                    x2={screenComp.x + 14}
                    y2={screenComp.y + 50}
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeDasharray="4 2"
                    className="animate-pulse"
                  />
                )}
              </g>
            )}

            {/* Соединительные провода: Ортогональная трассировка под 90 градусов */}
            {wires.map((wire) => {
              const p1 = terminalCoordinates.get(`${wire.from.componentId}:${wire.from.terminalId}`);
              const p2 = terminalCoordinates.get(`${wire.to.componentId}:${wire.to.terminalId}`);
              if (!p1 || !p2) return null;

              const pathD = computeOrthogonalPath(p1, p2);
              const isConducting = isBranchConducting;

              return (
                <g key={wire.id} className="cursor-pointer group">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="18"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeWire(wire.id);
                    }}
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={
                      isConducting
                        ? isLight
                          ? '#0284c7'
                          : '#38bdf8'
                        : isLight
                          ? '#94a3b8'
                          : '#64748b'
                    }
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-colors group-hover:stroke-rose-500"
                  />
                  {/* Анимированный ток (пунктир пропорционален току) */}
                  {isConducting && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeDasharray="6 8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-pulse"
                    />
                  )}
                </g>
              );
            })}

            {/* Линия протягиваемого провода от первого терминала к курсору */}
            {activeConnectingTerminal && activeTerminalPos && (
              <line
                x1={activeTerminalPos.x}
                y1={activeTerminalPos.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="5 5"
              />
            )}

            {/* Компоненты на монтажном столе (поддержка вращения, zero overlap) */}
            {components.map((comp) => {
              const isSelected = comp.id === selectedComponentId;
              const compPhys = circuitPhysics?.components[comp.id];
              const titleText = t(`component.${comp.type}`, language);
              const rotation = comp.rotation || 0;
              const isConducting = Boolean(compPhys?.isConducting);
              const isOverload = compPhys?.status === 'overload';

              const hasTermAWire = wires.some(
                (w) =>
                  (w.from.componentId === comp.id &&
                    (w.from.terminalId === 'neg' ||
                      w.from.terminalId === 'term_a' ||
                      w.from.terminalId === 'surface_in' ||
                      w.from.terminalId === 'sensor')) ||
                  (w.to.componentId === comp.id &&
                    (w.to.terminalId === 'neg' ||
                      w.to.terminalId === 'term_a' ||
                      w.to.terminalId === 'surface_in' ||
                      w.to.terminalId === 'sensor'))
              );
              const hasTermBWire = wires.some(
                (w) =>
                  (w.from.componentId === comp.id &&
                    (w.from.terminalId === 'pos' ||
                      w.from.terminalId === 'term_b' ||
                      w.from.terminalId === 'beam_out' ||
                      w.from.terminalId === 'surface_out')) ||
                  (w.to.componentId === comp.id &&
                    (w.to.terminalId === 'pos' ||
                      w.to.terminalId === 'term_b' ||
                      w.to.terminalId === 'beam_out' ||
                      w.to.terminalId === 'surface_out'))
              );

              const cardStroke = isSelected
                ? '#0284c7'
                : isOverload
                  ? '#ef4444'
                  : isConducting
                    ? '#10b981'
                    : compPhys?.isConnected
                      ? '#0284c7'
                      : isLight
                        ? '#cbd5e1'
                        : '#334155';
              const cardStrokeWidth = isSelected ? '2.5' : isConducting || isOverload ? '2' : '1.5';

              return (
                <g
                  key={comp.id}
                  transform={`translate(${comp.x}, ${comp.y}) rotate(${rotation}, ${CARD_WIDTH / 2}, ${CARD_HEIGHT / 2})`}
                  onMouseDown={(e) => handleComponentMouseDown(e, comp.id, comp.x, comp.y)}
                  className="cursor-move"
                >
                  {/* Фоновый контейнер карточки */}
                  <rect
                    width={CARD_WIDTH}
                    height={CARD_HEIGHT}
                    rx="12"
                    fill={isLight ? '#ffffff' : '#1e293b'}
                    stroke={cardStroke}
                    strokeWidth={cardStrokeWidth}
                    className={
                      isLight
                        ? 'filter drop-shadow(0 4px 10px rgba(0, 0, 0, 0.07))'
                        : 'shadow-lg filter drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4))'
                    }
                  />

                  {/* Верхняя шапка: изолированная полоса названия */}
                  <path
                    d={`M 0 12 A 12 12 0 0 1 12 0 L ${CARD_WIDTH - 12} 0 A 12 12 0 0 1 ${CARD_WIDTH} 12 L ${CARD_WIDTH} 24 L 0 24 Z`}
                    fill={isLight ? '#f8fafc' : '#0f172a'}
                  />
                  <line
                    x1="0"
                    y1="24"
                    x2={CARD_WIDTH}
                    y2="24"
                    stroke={isLight ? '#e2e8f0' : '#334155'}
                    strokeWidth="1"
                  />

                  {/* Заголовок типа компонента */}
                  <text
                    x="10"
                    y="16"
                    fill={isLight ? '#475569' : '#94a3b8'}
                    fontSize="9.5"
                    fontWeight="700"
                    letterSpacing="0.2"
                  >
                    {titleText.length > 20 ? `${titleText.slice(0, 19)}…` : titleText}
                  </text>

                  {/* Кнопка удаления */}
                  {isSelected && (
                    <g
                      transform={`translate(${CARD_WIDTH - 20}, 4)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeComponent(comp.id);
                      }}
                      className="cursor-pointer hover:opacity-80"
                    >
                      <circle cx="8" cy="8" r="8" fill="#ef4444" />
                      <path d="M 5 5 L 11 11 M 11 5 L 5 11" stroke="#ffffff" strokeWidth="1.5" />
                    </g>
                  )}

                  {/* Индикатор статуса цепи на карточке */}
                  {compPhys && compPhys.isConnected && !isSelected && (
                    <g transform={`translate(${CARD_WIDTH - 22}, 6)`}>
                      <circle
                        cx="7"
                        cy="6"
                        r="4"
                        fill={isConducting ? '#10b981' : '#f59e0b'}
                        className={isConducting ? 'animate-pulse' : ''}
                      />
                    </g>
                  )}

                  {/* ЦЕНТРАЛЬНАЯ ГРАФИКА */}
                  {/* Батарея */}
                  {comp.type === 'battery' && (
                    <g transform="translate(42, 34)">
                      <rect
                        x="0"
                        y="0"
                        width="80"
                        height="24"
                        rx="5"
                        fill={isLight ? '#fffbeb' : '#0f172a'}
                        stroke={isLight ? '#fcd34d' : '#475569'}
                      />
                      <rect x="15" y="4" width="50" height="16" rx="3" fill="#f59e0b" opacity="0.25" />
                      <text x="8" y="16" fill="#64748b" fontSize="13" fontWeight="bold">-</text>
                      <text x="66" y="16" fill="#ef4444" fontSize="13" fontWeight="bold">+</text>
                    </g>
                  )}

                  {/* Резистор */}
                  {comp.type === 'resistor' && (
                    <g transform="translate(42, 35)">
                      <rect
                        x="0"
                        y="0"
                        width="80"
                        height="22"
                        rx="4"
                        fill={isLight ? '#f0f9ff' : '#0f172a'}
                        stroke={isLight ? '#7dd3fc' : '#0ea5e9'}
                        strokeWidth="1.5"
                      />
                      <line x1="20" y1="0" x2="20" y2="22" stroke="#f59e0b" strokeWidth="3" />
                      <line x1="32" y1="0" x2="32" y2="22" stroke="#ef4444" strokeWidth="3" />
                      <line x1="48" y1="0" x2="48" y2="22" stroke="#3b82f6" strokeWidth="3" />
                      <line x1="60" y1="0" x2="60" y2="22" stroke="#eab308" strokeWidth="3" />
                    </g>
                  )}

                  {/* Реостат */}
                  {comp.type === 'rheostat' && (
                    <g transform="translate(42, 34)">
                      <rect
                        x="0"
                        y="0"
                        width="80"
                        height="22"
                        rx="4"
                        fill={isLight ? '#fef3c7' : '#0f172a'}
                        stroke="#d97706"
                        strokeWidth="1.5"
                      />
                      {/* Спиральная намотка */}
                      <path d="M 10 4 L 15 18 L 20 4 L 25 18 L 30 4 L 35 18 L 40 4 L 45 18 L 50 4 L 55 18 L 60 4 L 65 18 L 70 4" fill="none" stroke="#d97706" strokeWidth="1.5" />
                      {/* Ползунок */}
                      <polygon points="40,-2 44,8 36,8" fill="#ef4444" />
                    </g>
                  )}

                  {/* Конденсатор */}
                  {comp.type === 'capacitor' && (
                    <g transform="translate(62, 32)">
                      <line x1="12" y1="2" x2="12" y2="26" stroke="#0284c7" strokeWidth="3.5" />
                      <line x1="26" y1="2" x2="26" y2="26" stroke="#0284c7" strokeWidth="3.5" />
                      <line x1="0" y1="14" x2="12" y2="14" stroke="#64748b" strokeWidth="2" />
                      <line x1="26" y1="14" x2="38" y2="14" stroke="#64748b" strokeWidth="2" />
                    </g>
                  )}

                  {/* Диод */}
                  {comp.type === 'diode' && (
                    <g transform="translate(56, 32)">
                      <polygon points="10,4 28,14 10,24" fill="#0284c7" stroke="#0369a1" strokeWidth="1.5" />
                      <line x1="28" y1="4" x2="28" y2="24" stroke="#0369a1" strokeWidth="3" />
                      <line x1="0" y1="14" x2="10" y2="14" stroke="#64748b" strokeWidth="2" />
                      <line x1="28" y1="14" x2="48" y2="14" stroke="#64748b" strokeWidth="2" />
                    </g>
                  )}

                  {/* Мультиметр */}
                  {comp.type === 'multimeter' && (
                    <g transform="translate(48, 30)">
                      <rect x="0" y="0" width="68" height="28" rx="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                      <rect x="8" y="4" width="52" height="12" rx="2" fill="#0f172a" />
                      <text x="34" y="13.5" textAnchor="middle" fill="#22c55e" fontSize="9" fontFamily="monospace" fontWeight="bold">
                        {isBranchConducting ? '12.45 V' : '0.00 V'}
                      </text>
                      <circle cx="34" cy="22" r="3" fill="#64748b" />
                    </g>
                  )}

                  {/* Лампа накаливания */}
                  {comp.type === 'lamp' && (
                    <g transform="translate(62, 28)">
                      {comp.state.illuminated && (
                        <circle cx="20" cy="18" r="28" fill="url(#lampGlow)" className="animate-pulse" />
                      )}
                      <circle
                        cx="20"
                        cy="18"
                        r="16"
                        fill={comp.state.illuminated ? '#fef08a' : isLight ? '#f8fafc' : '#0f172a'}
                        stroke={comp.state.illuminated ? '#eab308' : isLight ? '#cbd5e1' : '#475569'}
                        strokeWidth="2"
                      />
                      <path
                        d="M 14 18 Q 20 10, 26 18"
                        fill="none"
                        stroke={comp.state.illuminated ? '#f59e0b' : '#64748b'}
                        strokeWidth="2"
                      />
                    </g>
                  )}

                  {/* Ключ (Выключатель) */}
                  {comp.type === 'switch' && (
                    <g
                      transform="translate(47, 32)"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSwitch(comp.id);
                      }}
                      className="cursor-pointer"
                    >
                      <circle cx="10" cy="14" r="4" fill="#0284c7" />
                      <circle cx="60" cy="14" r="4" fill="#0284c7" />
                      <line
                        x1="10"
                        y1="14"
                        x2={comp.state.isOpen ? '50' : '60'}
                        y2={comp.state.isOpen ? '-2' : '14'}
                        stroke={isLight ? '#0f172a' : '#f8fafc'}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </g>
                  )}

                  {/* Амперметр */}
                  {comp.type === 'ammeter' && (
                    <g transform="translate(62, 26)">
                      <circle
                        cx="20"
                        cy="18"
                        r="16"
                        fill={isLight ? '#faf5ff' : '#0f172a'}
                        stroke="#a855f7"
                        strokeWidth="2"
                      />
                      <text x="20" y="23" textAnchor="middle" fill="#9333ea" fontSize="13" fontWeight="bold">
                        A
                      </text>
                    </g>
                  )}

                  {/* Вольтметр */}
                  {comp.type === 'voltmeter' && (
                    <g transform="translate(62, 26)">
                      <circle
                        cx="20"
                        cy="18"
                        r="16"
                        fill={isLight ? '#fff1f2' : '#0f172a'}
                        stroke="#f43f5e"
                        strokeWidth="2"
                      />
                      <text x="20" y="23" textAnchor="middle" fill="#e11d48" fontSize="13" fontWeight="bold">
                        V
                      </text>
                    </g>
                  )}

                  {/* Оптика: Лазер */}
                  {comp.type === 'laser_source' && (
                    <g transform="translate(42, 32)">
                      <rect x="0" y="4" width="60" height="18" rx="3" fill="#1e293b" stroke="#475569" />
                      <rect x="60" y="8" width="12" height="10" rx="2" fill="#ef4444" />
                      <polygon points="72,13 80,9 80,17" fill="#ef4444" className="animate-pulse" />
                    </g>
                  )}

                  {/* Оптика: Собирающая линза */}
                  {comp.type === 'convex_lens' && (
                    <g transform="translate(62, 26)">
                      <path
                        d="M 20 2 Q 32 18, 20 34 Q 8 18, 20 2 Z"
                        fill={isLight ? '#e0f2fe' : '#0369a1'}
                        fillOpacity="0.6"
                        stroke="#0284c7"
                        strokeWidth="2"
                      />
                      <line x1="20" y1="0" x2="20" y2="36" stroke="#0284c7" strokeDasharray="2 2" strokeWidth="1" />
                    </g>
                  )}

                  {/* Оптика: Рассеивающая линза */}
                  {comp.type === 'concave_lens' && (
                    <g transform="translate(62, 26)">
                      <path
                        d="M 12 2 L 28 2 Q 20 18, 28 34 L 12 34 Q 20 18, 12 2 Z"
                        fill={isLight ? '#e0f2fe' : '#0369a1'}
                        fillOpacity="0.6"
                        stroke="#0284c7"
                        strokeWidth="2"
                      />
                    </g>
                  )}

                  {/* Оптика: Призма */}
                  {comp.type === 'optical_prism' && (
                    <g transform="translate(62, 26)">
                      <polygon points="20,2 38,34 2,34" fill={isLight ? '#e0f2fe' : '#0369a1'} fillOpacity="0.5" stroke="#0284c7" strokeWidth="2" />
                      <line x1="12" y1="20" x2="28" y2="20" stroke="#f59e0b" strokeWidth="1.5" />
                    </g>
                  )}

                  {/* Оптика: Экран */}
                  {comp.type === 'optical_screen' && (
                    <g transform="translate(62, 26)">
                      <rect
                        x="12"
                        y="2"
                        width="16"
                        height="32"
                        rx="2"
                        fill={isLight ? '#f1f5f9' : '#334155'}
                        stroke="#64748b"
                        strokeWidth="2"
                      />
                      <circle cx="20" cy="18" r="4" fill="#ef4444" opacity="0.8" className="animate-pulse" />
                    </g>
                  )}

                  {/* Биология: Микроскоп */}
                  {comp.type === 'microscope' && (
                    <g
                      transform="translate(62, 26)"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEyepieceOpen(true);
                      }}
                      className="cursor-pointer"
                    >
                      <rect x="16" y="2" width="8" height="12" rx="2" fill="#3b82f6" />
                      <path d="M 14 14 L 26 14 L 23 24 L 17 24 Z" fill="#64748b" />
                      <rect x="8" y="26" width="24" height="4" rx="1" fill="#1e293b" />
                      <path d="M 12 30 L 28 30 L 32 35 L 8 35 Z" fill="#475569" />
                    </g>
                  )}

                  {/* Биология: Препарат (Слайд) */}
                  {comp.type === 'slide_sample' && (
                    <g transform="translate(47, 30)">
                      <rect
                        x="0"
                        y="6"
                        width="70"
                        height="18"
                        rx="2"
                        fill={isLight ? '#f8fafc' : '#1e293b'}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                      />
                      <rect x="25" y="9" width="20" height="12" rx="1" fill="#a855f7" fillOpacity="0.4" stroke="#c084fc" />
                    </g>
                  )}

                  {/* Биология: Краситель */}
                  {comp.type === 'staining_agent' && (
                    <g transform="translate(67, 26)">
                      <rect x="8" y="10" width="14" height="22" rx="3" fill="#b45309" stroke="#78350f" />
                      <path d="M 15 2 Q 13 8, 15 10" stroke="#f59e0b" strokeWidth="2" />
                      <circle cx="15" cy="35" r="3" fill="#d97706" />
                    </g>
                  )}

                  {/* Биология: Пипетка */}
                  {comp.type === 'pipette' && (
                    <g transform="translate(67, 26)">
                      <rect x="12" y="2" width="6" height="8" rx="2" fill="#ef4444" />
                      <path d="M 13 10 L 17 10 L 16 32 L 14 32 Z" fill="#38bdf8" fillOpacity="0.6" stroke="#0284c7" strokeWidth="1" />
                      <circle cx="15" cy="36" r="2.5" fill="#38bdf8" />
                    </g>
                  )}

                  {/* Биология: Покровное стекло */}
                  {comp.type === 'cover_slip' && (
                    <g transform="translate(62, 30)">
                      <rect x="4" y="4" width="32" height="24" rx="1" fill="#bae6fd" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1.5" />
                    </g>
                  )}

                  {/* Биология: Чашка Петри */}
                  {comp.type === 'petri_dish' && (
                    <g transform="translate(62, 26)">
                      <circle cx="20" cy="18" r="16" fill={isLight ? '#f0fdf4' : '#052e16'} stroke="#22c55e" strokeWidth="1.5" />
                      <circle cx="17" cy="16" r="3" fill="#86efac" opacity="0.6" />
                      <circle cx="23" cy="20" r="4" fill="#86efac" opacity="0.6" />
                    </g>
                  )}

                  {/* НИЖНЯЯ ПЛАШКА ЗНАЧЕНИЙ (ВКЛЮЧАЕТ РАСЧЁТ НАПРЯЖЕНИЯ И СОПРОТИВЛЕНИЯ) */}
                  <g transform="translate(18, 73)">
                    <rect
                      x="0"
                      y="0"
                      width="128"
                      height="17"
                      rx="8"
                      fill={isLight ? '#f1f5f9' : '#0f172a'}
                      stroke={compPhys?.isConducting ? '#10b981' : isLight ? '#e2e8f0' : '#334155'}
                      strokeWidth={compPhys?.isConducting ? '1.5' : '1'}
                    />
                    <text
                      x="64"
                      y="12"
                      textAnchor="middle"
                      fill={
                        compPhys?.isConducting
                          ? isLight
                            ? '#047857'
                            : '#34d399'
                          : isLight
                            ? '#0284c7'
                            : '#38bdf8'
                      }
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {comp.type === 'battery' &&
                        (compPhys?.isConducting
                          ? `${formatVoltage(compPhys.voltageDrop)} • ${formatCurrent(compPhys.current)}`
                          : `${comp.values.voltage || 9} V`)}
                      {comp.type === 'resistor' &&
                        (compPhys && compPhys.isConducting
                          ? `U=${formatVoltage(compPhys.voltageDrop)} R=${formatResistance(compPhys.resistance)}`
                          : `${comp.values.resistance || 10} Ω`)}
                      {comp.type === 'rheostat' &&
                        (compPhys && compPhys.isConducting
                          ? `U=${formatVoltage(compPhys.voltageDrop)} R=${formatResistance(compPhys.resistance)}`
                          : `${comp.values.resistance || 25} Ω`)}
                      {comp.type === 'capacitor' && `${comp.values.capacitance || 100} µF`}
                      {comp.type === 'diode' &&
                        (compPhys && compPhys.isConducting
                          ? `U=${formatVoltage(compPhys.voltageDrop)} (1N4007)`
                          : '1N4007')}
                      {comp.type === 'multimeter' &&
                        (compPhys ? `${formatVoltage(compPhys.voltageDrop)}` : 'Auto DMM')}
                      {comp.type === 'lamp' &&
                        (compPhys && compPhys.isConducting
                          ? `U=${formatVoltage(compPhys.voltageDrop)} P=${formatPower(compPhys.power)}`
                          : `${comp.values.resistance || 15} Ω`)}
                      {comp.type === 'switch' &&
                        (comp.state.isOpen
                          ? compPhys && compPhys.voltageDrop > 0.05
                            ? `U=${formatVoltage(compPhys.voltageDrop)} (${t('property.open', language)})`
                            : t('property.open', language)
                          : `0.00 V (${t('property.closed', language)})`)}
                      {comp.type === 'ammeter' &&
                        `${formatCurrent(compPhys ? compPhys.current : (comp.state.reading !== undefined ? comp.state.reading : 0))}`}
                      {comp.type === 'voltmeter' &&
                        `${formatVoltage(compPhys ? compPhys.voltageDrop : (comp.state.reading !== undefined ? comp.state.reading : 0))}`}
                      {comp.type === 'laser_source' && `λ = ${comp.values.wavelength || 650} nm`}
                      {comp.type === 'convex_lens' && `F = ${comp.values.focalLength || 15} cm`}
                      {comp.type === 'concave_lens' && `F = -${comp.values.focalLength || 15} cm`}
                      {comp.type === 'optical_prism' && 'n = 1.52'}
                      {comp.type === 'optical_screen' && 'Screen'}
                      {comp.type === 'microscope' && `${comp.values.magnification || 400}×`}
                      {comp.type === 'slide_sample' && 'Sample'}
                      {comp.type === 'staining_agent' && 'Iodine'}
                      {comp.type === 'pipette' && 'Pipette'}
                      {comp.type === 'cover_slip' && 'Cover Slip'}
                      {comp.type === 'petri_dish' && 'Petri Dish'}
                    </text>
                  </g>

                  {/* ТЕРМИНАЛЫ ПОДКЛЮЧЕНИЯ */}
                  {comp.type !== 'laser_source' && (
                    <g
                      transform="translate(14, 50)"
                      onClick={(e) =>
                        handleTerminalClick(
                          e,
                          comp.id,
                          comp.type === 'battery'
                            ? 'neg'
                            : comp.type === 'convex_lens' || comp.type === 'concave_lens'
                              ? 'surface_in'
                              : comp.type === 'optical_screen'
                                ? 'sensor'
                                : 'term_a'
                        )
                      }
                      className="cursor-pointer group"
                    >
                      <circle cx="0" cy="0" r="8" fill="transparent" />
                      <circle
                        cx="0"
                        cy="0"
                        r={hasTermAWire ? '5' : '4.5'}
                        fill={
                          hasTermAWire
                            ? isConducting
                              ? '#10b981'
                              : '#0284c7'
                            : isLight
                              ? '#94a3b8'
                              : '#64748b'
                        }
                        stroke={hasTermAWire ? '#ffffff' : isLight ? '#cbd5e1' : '#334155'}
                        strokeWidth="1.5"
                        className="transition-transform group-hover:scale-125"
                      />
                    </g>
                  )}

                  {/* Правый терминал */}
                  {comp.type !== 'optical_screen' && comp.type !== 'microscope' && comp.type !== 'slide_sample' && (
                    <g
                      transform={`translate(${CARD_WIDTH - 14}, 50)`}
                      onClick={(e) =>
                        handleTerminalClick(
                          e,
                          comp.id,
                          comp.type === 'battery'
                            ? 'pos'
                            : comp.type === 'laser_source'
                              ? 'beam_out'
                              : comp.type === 'convex_lens' || comp.type === 'concave_lens'
                                ? 'surface_out'
                                : 'term_b'
                        )
                      }
                      className="cursor-pointer group"
                    >
                      <circle cx="0" cy="0" r="8" fill="transparent" />
                      <circle
                        cx="0"
                        cy="0"
                        r={hasTermBWire ? '5' : '4.5'}
                        fill={
                          hasTermBWire
                            ? isConducting
                              ? '#10b981'
                              : '#0284c7'
                            : isLight
                              ? '#94a3b8'
                              : '#64748b'
                        }
                        stroke={hasTermBWire ? '#ffffff' : isLight ? '#cbd5e1' : '#334155'}
                        strokeWidth="1.5"
                        className="transition-transform group-hover:scale-125"
                      />
                    </g>
                  )}

                  {/* Центральный терминал для микроскопа и предметного столика */}
                  {(comp.type === 'microscope' || comp.type === 'slide_sample') && (
                    <g
                      transform={`translate(${CARD_WIDTH / 2}, 70)`}
                      onClick={(e) =>
                        handleTerminalClick(
                          e,
                          comp.id,
                          comp.type === 'microscope' ? 'stage' : 'mount'
                        )
                      }
                      className="cursor-pointer group"
                    >
                      <circle cx="0" cy="0" r="8" fill="transparent" />
                      <circle
                        cx="0"
                        cy="0"
                        r="4.5"
                        fill="#22c55e"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="transition-transform group-hover:scale-125"
                      />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* ВИРТУАЛЬНАЯ ЛИНЕЙКА (ДЛЯ ОПТИКИ) */}
          {showRuler && (
            <div
              style={{left: rulerPos.x, top: rulerPos.y}}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingTool('ruler');
                setToolDragOffset({x: e.clientX - rulerPos.x, y: e.clientY - rulerPos.y});
              }}
              className="absolute z-30 cursor-move select-none shadow-xl rounded-md border border-amber-400/60 bg-amber-100/90 dark:bg-amber-950/80 backdrop-blur-md px-3 py-2 text-amber-950 dark:text-amber-200"
            >
              <div className="flex items-center justify-between mb-1 text-[10px] font-bold">
                <span>{t('tools.ruler', language)} (20 cm)</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRuler();
                  }}
                  className="hover:text-rose-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <svg width="220" height="28" className="overflow-visible">
                <line x1="0" y1="26" x2="210" y2="26" stroke="currentColor" strokeWidth="1" />
                {Array.from({length: 22}).map((_, i) => (
                  <g key={i} transform={`translate(${i * 10}, 0)`}>
                    <line x1="0" y1={i % 5 === 0 ? "10" : "18"} x2="0" y2="26" stroke="currentColor" strokeWidth={i % 5 === 0 ? "1.5" : "0.8"} />
                    {i % 5 === 0 && (
                      <text x="0" y="8" fontSize="8" textAnchor="middle" fill="currentColor" fontFamily="monospace">
                        {i / 1}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          )}

          {/* ВИРТУАЛЬНЫЙ ТРАНСПОРТИР (ДЛЯ ОПТИКИ) */}
          {showProtractor && (
            <div
              style={{left: protractorPos.x, top: protractorPos.y}}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingTool('protractor');
                setToolDragOffset({x: e.clientX - protractorPos.x, y: e.clientY - protractorPos.y});
              }}
              className="absolute z-30 cursor-move select-none shadow-2xl rounded-t-full border border-sky-400/60 bg-sky-100/85 dark:bg-sky-950/85 backdrop-blur-md w-52 h-28 flex flex-col items-center justify-end pb-1 text-sky-950 dark:text-sky-200"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleProtractor();
                }}
                className="absolute top-2 right-4 hover:text-rose-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <svg width="200" height="100" viewBox="0 0 200 100" className="overflow-visible">
                <path d="M 5 95 A 95 95 0 0 1 195 95 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="100" cy="95" r="3" fill="#ef4444" />
                {Array.from({length: 19}).map((_, i) => {
                  const angleDeg = i * 10;
                  const rad = (angleDeg * Math.PI) / 180;
                  const x1 = 100 - 95 * Math.cos(rad);
                  const y1 = 95 - 95 * Math.sin(rad);
                  const x2 = 100 - 82 * Math.cos(rad);
                  const y2 = 95 - 82 * Math.sin(rad);
                  return (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" />
                  );
                })}
              </svg>
              <span className="text-[10px] font-mono font-bold mt-1">0° — 180°</span>
            </div>
          )}
        </div>
      )}

      {/* РЕЖИМ ОКУЛЯРА МИКРОСКОПА (БИОЛОГИЯ) */}
      {isEyepieceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-slate-100">
            {/* Шапка окуляра */}
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">{t('tools.eyepiece', language)}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  {eyepieceSettings.zoom}× ({t('sample.onion', language)})
                </span>
              </div>
              <button
                onClick={() => setEyepieceOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Круглое поле зрения окуляра с эффектом фокусировки */}
            <div className="relative w-72 h-72 rounded-full border-4 border-slate-700 bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center">
              {/* Препарат под микроскопом */}
              <div
                style={{
                  filter: `blur(${focusBlurPx}px)`,
                  transition: 'filter 0.15s ease-out',
                }}
                className="relative w-full h-full p-4 flex flex-wrap gap-2 items-center justify-center bg-amber-50/10"
              >
                {/* Растительные клетки кожицы лука */}
                {Array.from({length: 6}).map((_, i) => (
                  <div
                    key={i}
                    onClick={() =>
                      updateEyepieceSettings({
                        selectedOrganelle:
                          i === 0 ? 'nucleus' : i === 1 ? 'cell_wall' : 'vacuole',
                      })
                    }
                    className="relative w-28 h-16 border-2 border-emerald-500/70 rounded-md bg-emerald-500/10 p-2 cursor-pointer hover:border-emerald-300 transition-colors"
                  >
                    {/* Ядро клетки */}
                    <div className="absolute top-3 right-4 w-4 h-4 rounded-full bg-amber-600/80 border border-amber-400 shadow-sm" />
                    {/* Вакуоль */}
                    <div className="absolute bottom-2 left-3 w-12 h-6 rounded-full bg-sky-400/20 border border-sky-400/40" />
                  </div>
                ))}
              </div>

              {/* Перекрестие окуляра и шкала */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-full h-px bg-white/20" />
                <div className="h-full w-px bg-white/20 absolute" />
                <div className="absolute bottom-4 right-4 text-[9px] font-mono text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded">
                  {eyepieceSettings.zoom >= 400 ? '50 µm' : '200 µm'}
                </div>
              </div>

              {/* Индикатор резкости */}
              {isSharpFocus && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow animate-pulse">
                  Четкий фокус (100%)
                </div>
              )}
            </div>

            {/* Выбранная органелла */}
            {eyepieceSettings.selectedOrganelle && (
              <div className="mt-3 text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>
                  {t(`organelle.${eyepieceSettings.selectedOrganelle}`, language)}:
                  {eyepieceSettings.selectedOrganelle === 'nucleus' && ` ${language === 'en' ? 'Contains DNA and controls cell division.' : language === 'ru' ? 'Содержит ДНК и управляет делением клетки.' : 'ДНК дорад ва тақсимшавии ҳуҷайраро идора мекунад.'}`}
                  {eyepieceSettings.selectedOrganelle === 'cell_wall' && ` ${language === 'en' ? 'A strong cellulose wall.' : language === 'ru' ? 'Прочная оболочка из целлюлозы.' : 'Пӯсти мустаҳкам аз селлюлоза.'}`}
                  {eyepieceSettings.selectedOrganelle === 'vacuole' && ` ${language === 'en' ? 'A reservoir for cell sap.' : language === 'ru' ? 'Резервуар клеточного сока.' : 'Захираи шираи ҳуҷайра.'}`}
                </span>
              </div>
            )}

            {/* Тандемы управления фокусировкой и увеличением */}
            <div className="w-full mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span>Фокусировка (Резкость):</span>
                <span className="font-mono text-emerald-400 font-bold">{eyepieceSettings.focus}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={eyepieceSettings.focus}
                onChange={(e) => updateEyepieceSettings({focus: Number(e.target.value)})}
                className="w-full accent-emerald-500 cursor-pointer"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs">Револьвер объективов:</span>
                <div className="flex gap-1.5">
                  {[100, 400, 1000].map((z) => (
                    <button
                      key={z}
                      onClick={() => updateEyepieceSettings({zoom: z})}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono border transition-all ${
                        eyepieceSettings.zoom === z
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {z}×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: ПРОТОКОЛ ПРИГОТОВЛЕНИЯ ПРЕПАРАТА (БИОЛОГИЯ) */}
      {showProtocolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">{t('tools.protocol', language)}</h3>
              </div>
              <button onClick={() => setShowProtocolModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="space-y-3 text-xs leading-relaxed list-decimal list-inside text-slate-300">
              <li>Капните пипеткой одну каплю чистой воды или слабого раствора Люголя на предметное стекло.</li>
              <li>Снимите препаровальной иглой тонкую прозрачную плёнку с внутренней поверхности чешуи лука.</li>
              <li>Поместите плёнку в каплю и аккуратно расправьте её кончиком иглы.</li>
              <li>Накройте покровным стеклом под углом 45°, чтобы избежать пузырьков воздуха.</li>
              <li>Установите препарат на столик микроскопа и зажмите лапками держателя.</li>
            </ol>
            <button
              onClick={() => setShowProtocolModal(false)}
              className="mt-5 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md"
            >
              Понятно, приступить к исследованию
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
