/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Интерактивный 3D-стенд физической лаборатории (Hero 3D)
 * Three.js WebGL-сцена с честной физикой цепей и геометрической оптики,
 * плавным управлением, Bloom-эффектами и бесшовным 2D-фоллбэком.
 * Идеальная светлая (чистая керамика, мягкие тени) и тёмная темы.
 */

import React, {useRef, useEffect, useState, useMemo, useCallback} from 'react';
import {
  Activity,
  ArrowRight,
  Boxes,
  Camera,
  Eye,
  Power,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import {useLabStore} from '../../store/useLabStore.ts';
import {InteractiveHeroBench} from '../InteractiveHeroBench.tsx';
import {Hero3DSceneManager} from './Hero3DScene.ts';
import {
  BenchMode,
  BiologyState,
  CircuitState,
  InteractiveHitObject,
  OpticsState,
  QualityLevel,
} from './types.ts';
import {t} from '../../../../shared/i18n.ts';

interface Hero3DContainerProps {
  initialMode?: BenchMode;
  inWorkbench?: boolean;
}

export const Hero3DContainer: React.FC<Hero3DContainerProps> = ({
  initialMode,
  inWorkbench = false,
}) => {
  const {language, theme, setCurrentView, selectLab} = useLabStore();
  const isLight = theme === 'light';
  const isTg = language === 'tg';

  // Состояние отображения: 3D или 2D-фоллбэк
  const [use3D, setUse3D] = useState<boolean>(true);
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);
  const [mode, setMode] = useState<BenchMode>(initialMode || 'circuit');
  const [quality, setQuality] = useState<QualityLevel>('auto');
  const [hoveredObject, setHoveredObject] = useState<InteractiveHitObject | null>(null);
  const [isFlying, setIsFlying] = useState<boolean>(false);

  // Физическое состояние цепи
  const [isSwitchClosed, setIsSwitchClosed] = useState<boolean>(true);
  const [rheostatR, setRheostatR] = useState<number>(20); // 10..100 Ом
  const [meterMode, setMeterMode] = useState<'V' | 'A' | 'R'>('V');

  // Физическое состояние оптики
  const [laserAngle, setLaserAngle] = useState<number>(30); // 15..60 град
  const [lensIndex, setLensIndex] = useState<number>(1.52); // Crown Glass

  // Физическое состояние биологии
  const [bioMagnification, setBioMagnification] = useState<number>(400); // 40, 100, 400, 1000
  const [bioFocus, setBioFocus] = useState<number>(0.5); // 0..1

  // Ref контейнера для Three.js canvas
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneManagerRef = useRef<Hero3DSceneManager | null>(null);

  // Физические расчеты цепи
  const batteryVoltage = 9.0;
  const lampBaseR = 10.0;
  const totalR = rheostatR + lampBaseR;
  const current = isSwitchClosed ? batteryVoltage / totalR : 0;
  const lampVoltage = isSwitchClosed ? current * lampBaseR : 0;
  const lampPower = isSwitchClosed ? current * current * lampBaseR : 0;
  const isOverloaded = lampPower > 1.2;

  // Расчет закона Снеллиуса
  const radAngle = (laserAngle * Math.PI) / 180;
  const sinRefract = Math.sin(radAngle) / lensIndex;
  const refractAngle = (Math.asin(Math.max(-1, Math.min(1, sinRefract))) * 180) / Math.PI;

  const circuitState: CircuitState = useMemo(
    () => ({
      isClosed: isSwitchClosed,
      rheostatR,
      batteryV: batteryVoltage,
      lampBaseR,
      multimeterMode: meterMode,
      current,
      lampVoltage,
      lampPower,
      isOverloaded,
    }),
    [isSwitchClosed, rheostatR, meterMode, current, lampVoltage, lampPower, isOverloaded]
  );

  const opticsState: OpticsState = useMemo(
    () => ({
      laserAngle,
      lensIndex,
      opticType: 'prism',
      refractAngle,
    }),
    [laserAngle, lensIndex, refractAngle]
  );

  const biologyState: BiologyState = useMemo(
    () => ({
      magnification: bioMagnification,
      focus: bioFocus,
      stain: 'lugol',
      sampleType: 'onion',
    }),
    [bioMagnification, bioFocus]
  );

  // Проверка доступности WebGL
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        setWebGlSupported(false);
        setUse3D(false);
      }
    } catch {
      setWebGlSupported(false);
      setUse3D(false);
    }
  }, []);

  // Инициализация Three.js сцены
  useEffect(() => {
    if (!use3D || !webGlSupported || !mountRef.current) return;

    try {
      const manager = new Hero3DSceneManager(mountRef.current, isLight, {
        onSwitchToggle: () => {
          setIsSwitchClosed((prev) => !prev);
        },
        onRheostatChange: (newR) => {
          setRheostatR(newR);
        },
        onMeterModeChange: () => {
          setMeterMode((prev) => (prev === 'V' ? 'A' : prev === 'A' ? 'R' : 'V'));
        },
        onLaserAngleChange: (newAngle) => {
          setLaserAngle(newAngle);
        },
        onHoverObject: (item) => {
          setHoveredObject(item);
        },
        onFlyComplete: () => {
          setIsFlying(false);
          if (mode === 'circuit') {
            selectLab('circuits-dc');
          } else if (mode === 'optics') {
            selectLab('optics-geometric');
          } else {
            selectLab('biology-microscopy');
          }
          setCurrentView('lab');
        },
      });

      sceneManagerRef.current = manager;
      manager.setBenchMode(mode);
      manager.updateCircuit(circuitState);
      manager.updateOptics(opticsState);
      manager.updateBiology(biologyState);
      manager.setQuality(quality);

      return () => {
        manager.dispose();
        sceneManagerRef.current = null;
      };
    } catch (err) {
      console.warn('Failed to initialize Hero 3D Scene:', err);
      setUse3D(false);
    }
  }, [use3D, webGlSupported]);

  // Синхронизация темы со сценой (плавный 400мс lerp)
  useEffect(() => {
    sceneManagerRef.current?.updateTheme(isLight);
  }, [isLight]);

  // Синхронизация режима (цепь/оптика/биология)
  useEffect(() => {
    sceneManagerRef.current?.setBenchMode(mode);
  }, [mode]);

  // Синхронизация физического состояния цепи
  useEffect(() => {
    sceneManagerRef.current?.updateCircuit(circuitState);
  }, [circuitState]);

  // Синхронизация состояния оптики
  useEffect(() => {
    sceneManagerRef.current?.updateOptics(opticsState);
  }, [opticsState]);

  // Синхронизация состояния биологии
  useEffect(() => {
    sceneManagerRef.current?.updateBiology(biologyState);
  }, [biologyState]);

  // Синхронизация качества
  const handleQualityChange = useCallback((lvl: QualityLevel) => {
    setQuality(lvl);
    sceneManagerRef.current?.setQuality(lvl);
  }, []);

  // Сброс к базовому состоянию
  const handleReset = useCallback(() => {
    setIsSwitchClosed(true);
    setRheostatR(20);
    setMeterMode('V');
    setLaserAngle(30);
    setBioMagnification(400);
    setBioFocus(0.5);
  }, []);

  // Клик "В лабораторию" с облетом камеры
  const handleOpenLab = useCallback(() => {
    if (sceneManagerRef.current) {
      setIsFlying(true);
      sceneManagerRef.current.startFlyToLab();
    } else {
      if (mode === 'circuit') {
        selectLab('circuits-dc');
      } else if (mode === 'optics') {
        selectLab('optics-geometric');
      } else {
        selectLab('biology-microscopy');
      }
      setCurrentView('lab');
    }
  }, [mode, selectLab, setCurrentView]);

  // Если 3D отключен или не поддерживается, рендерим 2D стенд с кнопкой возврата в 3D
  if (!use3D) {
    return (
      <div className="relative w-full max-w-[560px] mx-auto select-none space-y-2">
        <div className="flex justify-end mb-1">
          {webGlSupported && (
            <button
              onClick={() => setUse3D(true)}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isLight
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-xs'
                  : 'bg-sky-950/80 text-sky-400 border-sky-800/80 hover:bg-sky-900/80'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>{t('hero3d.toggle_3d', language)}</span>
            </button>
          )}
        </div>
        <InteractiveHeroBench />
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[620px] mx-auto select-none">
      {/* Декоративная аура подсветки контура */}
      <div
        className={`absolute -inset-2 rounded-3xl blur-2xl opacity-60 transition-colors duration-500 pointer-events-none ${
          isLight
            ? isSwitchClosed
              ? 'bg-gradient-to-r from-blue-200/50 via-amber-100/50 to-indigo-200/50'
              : 'bg-slate-200/40'
            : isSwitchClosed
              ? 'bg-gradient-to-r from-sky-600/30 via-amber-500/15 to-indigo-600/30'
              : 'bg-slate-800/40'
        }`}
      />

      {/* Основной корпус интерактивного 3D-модуля */}
      <div
        className={`relative rounded-3xl border transition-all duration-300 overflow-hidden shadow-2xl ${
          isLight
            ? 'bg-white/90 text-slate-800 border-slate-200/90 shadow-blue-500/10 backdrop-blur-md'
            : 'bg-slate-950/95 text-slate-100 border-slate-800 shadow-black/60'
        }`}
      >
        {/* ВЕРХНЯЯ СТАТУСНАЯ ПАНЕЛЬ СТЕНДА */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b text-xs transition-colors duration-300 ${
            isLight
              ? 'bg-slate-50/90 border-slate-200/90 text-slate-700'
              : 'bg-slate-950/90 border-slate-800/90 text-slate-300'
          }`}
        >
          {/* Переключатель режимов (Цепь тока | Оптика | Микроскопия) */}
          <div
            className={`flex items-center gap-1 p-0.5 rounded-lg border transition-colors ${
              isLight ? 'bg-slate-200/70 border-slate-300/80' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <button
              onClick={() => setMode('circuit')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                mode === 'circuit'
                  ? isLight
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'bg-sky-600 text-white shadow-xs'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className={`w-3 h-3 ${isLight ? 'text-amber-500' : 'text-amber-400'}`} />
              <span>{t('hero3d.circuit_mode', language)}</span>
            </button>

            <button
              onClick={() => setMode('optics')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                mode === 'optics'
                  ? isLight
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'bg-sky-600 text-white shadow-xs'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              <span>{t('hero3d.optics_mode', language)}</span>
            </button>

            <button
              onClick={() => setMode('biology')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                mode === 'biology'
                  ? isLight
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'bg-sky-600 text-white shadow-xs'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Boxes className={`w-3 h-3 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
              <span>{t('hero3d.bio_mode', language)}</span>
            </button>
          </div>

          {/* Правая группа: 3D/2D тоггл, сброс */}
          <div className="flex items-center gap-1.5">
            {/* Кнопка сброса */}
            <button
              onClick={handleReset}
              title={t('hero3d.reset', language)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-300 shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Переключатель 3D / 2D */}
            {!inWorkbench && (
              <button
                onClick={() => setUse3D(false)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300 shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <span>{t('hero3d.toggle_2d', language)}</span>
              </button>
            )}
          </div>
        </div>

        {/* 3D ВЬЮПОРТ (WebGL CANVAS CONTAINER С МЯГКИМ ФОНОМ СТУДИИ) */}
        <div
          className={`relative w-full h-[360px] sm:h-[420px] overflow-hidden transition-colors duration-500 ${
            isLight
              ? 'bg-gradient-to-b from-[#eef3fa] via-[#e2ecf8] to-[#d9e4f2]'
              : 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950'
          }`}
        >
          {/* Контейнер Canvas Three.js */}
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Плавающая плашка подсказки наведения (Hover Tooltip) */}
          {hoveredObject && (
            <div
              className={`absolute top-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-xl text-xs shadow-xl flex items-center gap-2 pointer-events-none animate-in fade-in zoom-in-95 border ${
                isLight
                  ? 'bg-white/95 border-blue-200 text-slate-800 shadow-blue-500/10'
                  : 'bg-slate-900/90 border-sky-500/40 text-slate-100'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-blue-600' : 'text-sky-400'}`} />
              <div>
                <span className={`font-bold ${isLight ? 'text-blue-700' : 'text-sky-300'}`}>
                  {hoveredObject.title}
                </span>
                <span className={`ml-1.5 text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  ({hoveredObject.hint})
                </span>
              </div>
            </div>
          )}

          {/* Индикатор вращения сцены в углу */}
          <div
            className={`absolute bottom-3 right-3 px-2 py-1 rounded-md text-[10px] pointer-events-none flex items-center gap-1.5 border ${
              isLight
                ? 'bg-white/80 border-slate-300 text-slate-600 shadow-xs'
                : 'bg-slate-950/70 border-slate-800 text-slate-400'
            }`}
          >
            <Camera className={`w-3 h-3 ${isLight ? 'text-slate-500' : 'text-slate-500'}`} />
            <span>{t('hero3d.drag_rotate', language)}</span>
          </div>

          {/* Быстрые ползунки для точной подстройки прямо с экрана */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 pointer-events-auto">
            {mode === 'circuit' ? (
              <div
                className={`p-2 rounded-xl border text-right shadow-sm ${
                  isLight
                    ? 'bg-white/90 border-slate-200 text-slate-800'
                    : 'bg-slate-950/80 border-slate-800/90 text-slate-200'
                }`}
              >
                <div
                  className={`text-[10px] font-bold mb-1 flex items-center justify-end gap-1 ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  <Sliders className={`w-3 h-3 ${isLight ? 'text-blue-600' : 'text-sky-400'}`} />
                  <span>R = {rheostatR} Ω</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={rheostatR}
                  onChange={(e) => setRheostatR(Number(e.target.value))}
                  className={`w-24 h-1.5 rounded-lg appearance-none cursor-pointer ${
                    isLight ? 'bg-slate-200 accent-blue-600' : 'bg-slate-800 accent-sky-500'
                  }`}
                />
              </div>
            ) : mode === 'optics' ? (
              <div
                className={`p-2 rounded-xl border text-right shadow-sm ${
                  isLight
                    ? 'bg-white/90 border-slate-200 text-slate-800'
                    : 'bg-slate-950/80 border-slate-800/90 text-slate-200'
                }`}
              >
                <div
                  className={`text-[10px] font-bold mb-1 flex items-center justify-end gap-1 ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  <Sliders className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  <span>α = {laserAngle}°</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="1"
                  value={laserAngle}
                  onChange={(e) => setLaserAngle(Number(e.target.value))}
                  className={`w-24 h-1.5 rounded-lg appearance-none cursor-pointer ${
                    isLight ? 'bg-slate-200 accent-emerald-600' : 'bg-slate-800 accent-emerald-500'
                  }`}
                />
              </div>
            ) : (
              <div
                className={`p-2 rounded-xl border text-right shadow-sm ${
                  isLight
                    ? 'bg-white/90 border-slate-200 text-slate-800'
                    : 'bg-slate-950/80 border-slate-800/90 text-slate-200'
                }`}
              >
                <div
                  className={`text-[10px] font-bold mb-1 flex items-center justify-end gap-1 ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  <Sliders className={`w-3 h-3 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                  <span>{bioMagnification}×</span>
                </div>
                <div className="flex gap-1 justify-end">
                  {[40, 100, 400, 1000].map((mag) => (
                    <button
                      key={mag}
                      onClick={() => setBioMagnification(mag)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                        bioMagnification === mag
                          ? 'bg-purple-600 text-white'
                          : isLight
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {mag}×
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* НИЖНИЙ ЕДИНЫЙ ПУЛЬТ УПРАВЛЕНИЯ И ТЕЛЕМЕТРИИ */}
        <div
          className={`border-t p-3.5 space-y-3 transition-colors duration-300 ${
            isLight
              ? 'border-slate-200/90 bg-white/95 text-slate-800'
              : 'border-slate-800/90 bg-slate-950/95 text-slate-100'
          }`}
        >
          {/* Строка живых физических формул и значений */}
          <div
            className={`flex flex-wrap items-center justify-between gap-3 text-xs rounded-xl p-2.5 border transition-colors ${
              isLight
                ? 'bg-slate-50 border-slate-200/90 text-slate-700'
                : 'bg-slate-900/80 border-slate-800 text-slate-300'
            }`}
          >
            {mode === 'circuit' ? (
              <>
                <div className="space-y-0.5">
                  <div
                    className={`text-[11px] font-bold flex items-center gap-1.5 ${
                      isLight ? 'text-blue-600' : 'text-sky-400'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{t('hero3d.formula_ohm', language)}</span>
                  </div>
                  <div className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    I = 9.0V / ({rheostatR}Ω + 10Ω) ={' '}
                    <span className={`font-bold ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                      {current.toFixed(2)} A
                    </span>
                    {' • '}
                    P ={' '}
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                      {lampPower.toFixed(2)} W
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSwitchClosed((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSwitchClosed
                        ? isLight
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-xs'
                          : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                        : isLight
                          ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 shadow-xs'
                          : 'bg-red-600/20 text-red-300 border-red-500/40 hover:bg-red-600/30'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isSwitchClosed ? (isTg ? 'Пӯшида' : 'Замкнуто') : isTg ? 'Кушода' : 'Разомкнуто'}</span>
                  </button>
                </div>
              </>
            ) : mode === 'optics' ? (
              <>
                <div className="space-y-0.5">
                  <div
                    className={`text-[11px] font-bold flex items-center gap-1.5 ${
                      isLight ? 'text-emerald-600' : 'text-emerald-400'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{t('hero3d.formula_snell', language)}</span>
                  </div>
                  <div className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    1.00 · sin({laserAngle}°) = {lensIndex.toFixed(2)} · sin(β) → β ={' '}
                    <span className={`font-bold ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                      {refractAngle.toFixed(1)}°
                    </span>
                  </div>
                </div>

                <div
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                    isLight
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
                      : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  }`}
                >
                  {isTg ? 'Шикасти оптикӣ' : 'Дисперсия в призме'}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-0.5">
                  <div
                    className={`text-[11px] font-bold flex items-center gap-1.5 ${
                      isLight ? 'text-purple-600' : 'text-purple-400'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{t('hero3d.formula_bio', language)}</span>
                  </div>
                  <div className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    M = 10× · {bioMagnification / 10}× ={' '}
                    <span className={`font-bold ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>
                      {bioMagnification}×
                    </span>
                    {' • '}
                    FOV ≈{' '}
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                      {Math.round(180000 / bioMagnification)} µm
                    </span>
                  </div>
                </div>

                <div
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                    isLight
                      ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-xs'
                      : 'bg-purple-950/60 border-purple-800 text-purple-300'
                  }`}
                >
                  {isTg ? 'Эпидермиси пиёз' : 'Клетки кожицы лука'}
                </div>
              </>
            )}
          </div>

          {/* Главная кнопка перехода с анимацией fly-to к лабораторному столу */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {isTg
                ? 'Тамоми равандҳои физикӣ дар браузер ҳисоб мешаванд'
                : 'Все процессы рассчитываются в реальном времени'}
            </div>

            <button
              onClick={handleOpenLab}
              disabled={isFlying}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-blue-600/25 active:scale-95 flex items-center gap-2 group cursor-pointer"
            >
              <span>{isFlying ? (isTg ? 'Гузариш...' : 'Переход...') : t('hero3d.fly_to_lab', language)}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
