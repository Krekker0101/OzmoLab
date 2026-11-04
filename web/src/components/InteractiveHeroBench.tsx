/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Интерактивный физический стенд для Hero-секции
 * Поддерживает премиальную светлую (керамический стенд, янтарное свечение, Fluke-мультиметр)
 * и тёмную (кибернетический лабораторный стенд) темы.
 */

import React, {useState, useEffect} from 'react';
import {
  Activity,
  ArrowRight,
  Battery,
  Flame,
  Gauge,
  Lightbulb,
  Maximize2,
  Power,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import {useLabStore} from '../store/useLabStore.ts';
import {t} from '../../../shared/i18n.ts';

type BenchMode = 'circuit' | 'optics';

export const InteractiveHeroBench: React.FC = () => {
  const {language, theme, setCurrentView, selectLab} = useLabStore();
  const isLight = theme === 'light';
  const isTg = language === 'tg';

  const [mode, setMode] = useState<BenchMode>('circuit');

  // Параметры электрической цепи
  const [isSwitchClosed, setIsSwitchClosed] = useState<boolean>(true);
  const [rheostatR, setRheostatR] = useState<number>(20); // 10..100 Ом
  const [meterMode, setMeterMode] = useState<'V' | 'A' | 'R'>('V');
  const [voltageJitter, setVoltageJitter] = useState<number>(0);

  // Параметры оптики
  const [laserAngle, setLaserAngle] = useState<number>(30); // 10..60 градусов
  const [lensIndex, setLensIndex] = useState<number>(1.52); // Стекло Крон 1.52

  // Физический расчет цепи
  const batteryVoltage = 9.0;
  const lampBaseR = 10.0;
  const totalR = rheostatR + lampBaseR;
  const current = isSwitchClosed ? batteryVoltage / totalR : 0;
  const lampVoltage = isSwitchClosed ? current * lampBaseR : 0;
  const bulbBrightness = isSwitchClosed ? Math.min(1, Math.max(0.15, current / 0.45)) : 0;

  // Небольшое натуральное дрожание показаний мультиметра (реалистичный АЦП)
  useEffect(() => {
    if (!isSwitchClosed) {
      setVoltageJitter(0);
      return;
    }
    const interval = setInterval(() => {
      setVoltageJitter((Math.random() - 0.5) * 0.02);
    }, 400);
    return () => clearInterval(interval);
  }, [isSwitchClosed]);

  const displayVoltage = isSwitchClosed
    ? (meterMode === 'V' ? (batteryVoltage + voltageJitter).toFixed(2) : (lampVoltage + voltageJitter).toFixed(2))
    : '0.00';
  const displayCurrent = isSwitchClosed ? (current + voltageJitter * 0.05).toFixed(2) : '0.00';
  const displayResistance = isSwitchClosed ? totalR.toFixed(1) : 'OL'; // Over-limit/open

  // Расчет угла преломления для оптики по закону Снеллиуса
  const radAngle = (laserAngle * Math.PI) / 180;
  const sinRefract = Math.sin(radAngle) / lensIndex;
  const refractAngle = (Math.asin(sinRefract) * 180) / Math.PI;

  return (
    <div className="relative w-full max-w-[560px] mx-auto select-none">
      {/* Декоративная подсветка контура */}
      <div
        className={`absolute -inset-1.5 rounded-3xl blur-xl opacity-70 transition-colors duration-500 pointer-events-none ${
          isLight
            ? isSwitchClosed
              ? 'bg-gradient-to-r from-blue-200 via-amber-200/80 to-sky-200'
              : 'bg-slate-200/60'
            : isSwitchClosed
              ? 'bg-gradient-to-r from-sky-600/40 via-amber-500/20 to-indigo-600/30'
              : 'bg-slate-800/40'
        }`}
      />

      {/* Корпус лабораторного стенда */}
      <div
        className={`relative rounded-2xl border transition-all duration-300 overflow-hidden ${
          isLight
            ? 'bg-white text-slate-800 border-slate-200/90 shadow-2xl shadow-blue-500/10'
            : 'bg-slate-900/95 text-slate-100 border-slate-700 shadow-sky-950/40 shadow-2xl'
        }`}
      >
        {/* Верхняя контрольная планка стенда */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 border-b text-xs transition-colors ${
            isLight
              ? 'bg-slate-50/90 border-slate-200/90 text-slate-700'
              : 'bg-slate-950/80 border-slate-800 text-slate-300'
          }`}
        >
          {/* Режимы стенда */}
          <div
            className={`flex items-center gap-1.5 p-0.5 rounded-lg border transition-colors ${
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
              <span>{isTg ? 'Занҷири барқӣ' : language === 'ru' ? 'Цепь тока' : 'Electrical circuit'}</span>
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
              <Lightbulb className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              <span>{isTg ? 'Оптика ва нур' : language === 'ru' ? 'Оптика' : 'Optics and light'}</span>
            </button>
          </div>

          {/* Индикатор реального времени */}
          <div className="flex items-center gap-2.5">
            <span
              className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                isLight ? 'text-emerald-700' : 'text-emerald-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">
                {isTg ? 'Стенди интерактивӣ' : language === 'ru' ? 'Интерактивный стенд' : 'Interactive bench'}
              </span>
            </span>

            <button
              onClick={() => {
                selectLab(mode === 'circuit' ? 'circuits-dc' : 'optics');
                setCurrentView('lab');
              }}
              title={isTg ? 'Гузариш ба озмоишгоҳ' : language === 'ru' ? 'Открыть в лаборатории' : 'Open in laboratory'}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                isLight
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs'
                  : 'bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-300'
              }`}
            >
              <Maximize2 className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">{isTg ? 'Кушодан' : language === 'ru' ? 'В лабораторию' : 'Open laboratory'}</span>
            </button>
          </div>
        </div>

        {/* ОСНОВНОЕ РАБОЧЕЕ ПОЛЕ СТЕНДА */}
        <div className={`p-4 sm:p-5 ${isLight ? 'bg-white' : 'bg-slate-900'}`}>
          {mode === 'circuit' ? (
            /* ================= РЕЖИМ 1: ЦЕПЬ ТОКА ================= */
            <div className="space-y-4">
              {/* Верхняя витрина: Лабораторная монтажная плата со схемой */}
              <div
                className={`relative h-48 sm:h-52 rounded-xl border p-3 overflow-hidden flex items-center justify-center transition-colors ${
                  isLight
                    ? 'bg-slate-50/90 border-slate-200/90 shadow-inner'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                {/* Фоновая координатная сетка реального лабораторного стенда */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: isLight
                      ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)'
                      : 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                    opacity: isLight ? 0.6 : 0.2,
                  }}
                />

                {/* SVG Соединительные провода с анимацией тока */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 460 200"
                  fill="none"
                  strokeWidth="3.5"
                >
                  {/* Батарея -> Ключ (Красный провод питания Vcc) */}
                  <path
                    d="M 90 70 L 90 40 L 190 40"
                    stroke={isLight ? (isSwitchClosed ? '#ef4444' : '#fca5a5') : (isSwitchClosed ? '#f43f5e' : '#881337')}
                    strokeLinecap="round"
                  />
                  {/* Ключ -> Лампа (Коммутируемый провод) */}
                  <path
                    d="M 270 40 L 370 40 L 370 80"
                    stroke={isLight ? (isSwitchClosed ? '#d97706' : '#fde68a') : (isSwitchClosed ? '#fbbf24' : '#78350f')}
                    strokeLinecap="round"
                  />
                  {/* Лампа -> Реостат -> Батарея (Синий общий провод GND) */}
                  <path
                    d="M 370 120 L 370 160 L 270 160 M 190 160 L 90 160 L 90 130"
                    stroke={isLight ? (isSwitchClosed ? '#2563eb' : '#bfdbfe') : (isSwitchClosed ? '#38bdf8' : '#0c4a6e')}
                    strokeLinecap="round"
                  />

                  {/* Бегущие заряды электронов при замкнутом ключе */}
                  {isSwitchClosed && (
                    <path
                      d="M 90 70 L 90 40 L 190 40 L 270 40 L 370 40 L 370 80 L 370 120 L 370 160 L 90 160 L 90 130"
                      stroke={isLight ? '#0284c7' : '#38bdf8'}
                      strokeWidth={isLight ? '2.5' : '2.5'}
                      strokeDasharray="6 8"
                      strokeLinecap="round"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        values="100;0"
                        dur={`${Math.max(0.6, 2.5 - current * 3)}s`}
                        repeatCount="indefinite"
                      />
                    </path>
                  )}
                </svg>

                {/* УНСУР 1: Источник питания 9V (Батарея) */}
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div
                    className={`relative w-14 h-20 rounded-lg border-2 flex flex-col items-center justify-between p-1.5 shadow-md transition-colors ${
                      isLight
                        ? 'bg-gradient-to-b from-slate-100 to-slate-200 border-slate-300 text-slate-800'
                        : 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700 text-slate-100'
                    }`}
                  >
                    <div className="flex gap-2">
                      <div className="w-2.5 h-2 bg-rose-500 rounded-t-xs" title="+ 9V" />
                      <div className="w-2.5 h-2 bg-blue-600 rounded-t-xs" title="- GND" />
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-[10px] font-black font-mono ${
                          isLight ? 'text-blue-700' : 'text-amber-400'
                        }`}
                      >
                        9V
                      </div>
                      <div
                        className={`text-[8px] font-bold uppercase ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        DC PWR
                      </div>
                    </div>
                    <div className="w-full h-1 bg-blue-500 rounded-xs" />
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {isTg ? 'Манбаъ (9В)' : language === 'ru' ? 'Источник (9В)' : 'Source (9 V)'}
                  </span>
                </div>

                {/* УНСУР 2: Тактильный рубильник / Ключ (Кликабельный!) */}
                <div className="absolute left-[38%] top-4 -translate-x-1/2 flex flex-col items-center">
                  <button
                    onClick={() => setIsSwitchClosed(!isSwitchClosed)}
                    className={`relative w-20 h-10 rounded-lg border-2 p-1 flex items-center transition-all cursor-pointer group shadow-md active:scale-95 ${
                      isLight
                        ? isSwitchClosed
                          ? 'bg-emerald-50 border-emerald-500 shadow-emerald-500/20'
                          : 'bg-rose-50 border-rose-400 shadow-rose-500/10'
                        : isSwitchClosed
                          ? 'bg-emerald-950/80 border-emerald-500 shadow-emerald-950/50'
                          : 'bg-rose-950/60 border-rose-600/70 shadow-rose-950/30'
                    }`}
                    title={isSwitchClosed ? 'Кушодани калид (Размыкание)' : 'Пӯшидани калид (Замыкание)'}
                  >
                    {/* Контакты ножевого рубильника */}
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isLight ? 'bg-amber-600' : 'bg-amber-400'
                      }`}
                    />
                    <div
                      className={`h-1.5 flex-1 mx-1 rounded-full transition-transform duration-200 origin-left ${
                        isSwitchClosed
                          ? isLight
                            ? 'bg-emerald-600 rotate-0 shadow-[0_0_6px_#10b981]'
                            : 'bg-emerald-400 rotate-0 shadow-[0_0_8px_#34d399]'
                          : isLight
                            ? 'bg-rose-500 -rotate-30 opacity-80'
                            : 'bg-rose-400 -rotate-30 opacity-80'
                      }`}
                    />
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isLight ? 'bg-amber-600' : 'bg-amber-400'
                      }`}
                    />
                  </button>
                  <span
                    className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${
                      isLight ? 'text-slate-700' : 'text-slate-300'
                    }`}
                  >
                    <Power
                      className={`w-2.5 h-2.5 ${
                        isSwitchClosed
                          ? isLight
                            ? 'text-emerald-600'
                            : 'text-emerald-400'
                          : isLight
                            ? 'text-rose-600'
                            : 'text-rose-400'
                      }`}
                    />
                    {isSwitchClosed ? (isTg ? 'Калид пӯшида' : language === 'ru' ? 'Замкнут' : 'Closed') : (isTg ? 'Калид кушода' : language === 'ru' ? 'Разомкнут' : 'Open')}
                  </span>
                </div>

                {/* УНСУР 3: Лампа накаливания с живым свечением */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    {/* Тёплый ореол света вокруг лампы при замыкании */}
                    {isSwitchClosed && (
                      <div
                        className="absolute inset-0 rounded-full transition-all duration-300 pointer-events-none"
                        style={{
                          backgroundColor: '#f59e0b',
                          opacity: bulbBrightness * (isLight ? 0.45 : 0.7),
                          filter: `blur(${16 + bulbBrightness * 12}px)`,
                          transform: `scale(${1 + bulbBrightness * 0.7})`,
                        }}
                      />
                    )}

                    {/* Стеклянная колба лампы */}
                    <div
                      className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                        isLight
                          ? isSwitchClosed
                            ? 'border-amber-400 bg-amber-50 shadow-[0_0_16px_rgba(245,158,11,0.5)]'
                            : 'border-slate-300 bg-white'
                          : isSwitchClosed
                            ? 'border-amber-300 bg-amber-100/30 shadow-[0_0_20px_#f59e0b]'
                            : 'border-slate-700 bg-slate-900/60'
                      }`}
                    >
                      {/* Нить накала внутри колбы */}
                      <Flame
                        className={`w-6 h-6 transition-all duration-200 ${
                          isSwitchClosed
                            ? isLight
                              ? 'text-amber-500 filter drop-shadow-[0_0_6px_#f59e0b] animate-pulse'
                              : 'text-amber-200 filter drop-shadow-[0_0_8px_#fbbf24] animate-pulse'
                            : isLight
                              ? 'text-slate-300'
                              : 'text-slate-600'
                        }`}
                      />
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {isTg ? 'Лампаи тафсон' : language === 'ru' ? 'Лампа' : 'Incandescent lamp'} (10Ω)
                  </span>
                </div>

                {/* УНСУР 4: Реостат с ползунком внизу по центру */}
                <div className="absolute left-[38%] bottom-2.5 -translate-x-1/2 w-40 flex flex-col items-center">
                  <div
                    className={`w-full rounded-lg px-2.5 py-1.5 border transition-colors ${
                      isLight
                        ? 'bg-white border-slate-200/90 shadow-xs'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[9px] font-mono mb-0.5">
                      <span className={isLight ? 'text-slate-600 font-semibold' : 'text-slate-300'}>
                        {isTg ? 'Реостат:' : language === 'ru' ? 'Реостат:' : 'Rheostat:'}
                      </span>
                      <span
                        className={`font-black ${
                          isLight ? 'text-blue-600' : 'text-amber-400'
                        }`}
                      >
                        {rheostatR} Ω
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={rheostatR}
                      onChange={(e) => setRheostatR(Number(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600 bg-slate-200 dark:bg-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Нижняя панель: Цифровой мультиметр (Fluke Style) и формула */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-12 gap-3 items-center rounded-xl border p-3 transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-200/90 shadow-xs'
                    : 'bg-slate-950/90 border-slate-800'
                }`}
              >
                {/* Экран мультиметра */}
                <div className="sm:col-span-7 flex items-center gap-3">
                  {/* Дисплей с цифровыми сегментами */}
                  <div
                    className={`flex-1 rounded-lg p-2.5 shadow-inner border-2 transition-colors ${
                      isLight
                        ? 'bg-emerald-50/80 border-emerald-300'
                        : 'bg-emerald-950/70 border-emerald-800/80'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between text-[9px] font-mono mb-1 font-semibold ${
                        isLight ? 'text-emerald-800' : 'text-emerald-400/80'
                      }`}
                    >
                      <span>DIGITAL MULTIMETER</span>
                      <span className="font-bold">{meterMode} MODE</span>
                    </div>
                    <div className="flex items-baseline justify-between font-mono">
                      <span
                        className={`text-2xl font-black tracking-wider ${
                          isLight ? 'text-emerald-900' : 'text-emerald-300'
                        }`}
                      >
                        {meterMode === 'V'
                          ? displayVoltage
                          : meterMode === 'A'
                            ? displayCurrent
                            : displayResistance}
                      </span>
                      <span
                        className={`text-base font-black ml-1 ${
                          isLight ? 'text-emerald-700' : 'text-emerald-400'
                        }`}
                      >
                        {meterMode === 'V' ? 'V' : meterMode === 'A' ? 'A' : 'Ω'}
                      </span>
                    </div>
                  </div>

                  {/* Селектор режимов мультиметра */}
                  <div className="flex flex-col gap-1">
                    {(['V', 'A', 'R'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMeterMode(m)}
                        className={`w-7 h-6 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          meterMode === m
                            ? isLight
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-amber-500 text-slate-950 shadow-xs'
                            : isLight
                              ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Быстрое резюме физики и формула */}
                <div
                  className={`sm:col-span-5 text-left border-t sm:border-t-0 sm:border-l pt-2 sm:pt-0 sm:pl-3 ${
                    isLight ? 'border-slate-200 text-slate-700' : 'border-slate-800 text-slate-300'
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {isTg ? 'Қонуни Ом барои занҷир:' : language === 'ru' ? 'Закон Ома для цепи:' : "Ohm's law for the circuit:"}
                  </div>
                  <div
                    className={`text-xs font-mono font-black mt-0.5 ${
                      isLight ? 'text-blue-600' : 'text-sky-400'
                    }`}
                  >
                    I = U / (R₁ + R₂)
                  </div>
                  <div
                    className={`text-[10px] font-medium mt-1 leading-snug ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {isTg
                      ? `Ҷараён: ${displayCurrent} A · Қувва: ${(Number(displayCurrent) * lampVoltage).toFixed(2)} Вт`
                      : `Ток: ${displayCurrent} A · Мощность лампы: ${(Number(displayCurrent) * lampVoltage).toFixed(2)} Вт`}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= РЕЖИМ 2: ОПТИКА И ЛАЗЕР ================= */
            <div className="space-y-4">
              <div
                className={`relative h-48 sm:h-52 rounded-xl border p-3 overflow-hidden flex items-center justify-center transition-colors ${
                  isLight
                    ? 'bg-slate-50/90 border-slate-200/90 shadow-inner'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                {/* Оптический рельс */}
                <div
                  className={`absolute inset-x-6 top-1/2 -translate-y-1/2 h-2 rounded-full border ${
                    isLight
                      ? 'bg-slate-200 border-slate-300'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                />

                {/* SVG Луч лазера с преломлением в стеклянной призме */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 460 200"
                >
                  {/* Падающий луч (Зелёный лазер 532nm) */}
                  <line
                    x1="40"
                    y1={100 - laserAngle * 1.2}
                    x2="230"
                    y2="100"
                    stroke="#16a34a"
                    strokeWidth="3"
                    className="filter drop-shadow-[0_0_6px_#22c55e]"
                  />
                  {/* Преломленный луч внутри и на выходе */}
                  <line
                    x1="230"
                    y1="100"
                    x2="420"
                    y2={100 + refractAngle * 1.5}
                    stroke="#16a34a"
                    strokeWidth="3"
                    className="filter drop-shadow-[0_0_6px_#22c55e]"
                  />
                  {/* Нормаль к границе раздела (пунктир) */}
                  <line
                    x1="230"
                    y1="30"
                    x2="230"
                    y2="170"
                    stroke={isLight ? '#94a3b8' : '#64748b'}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                </svg>

                {/* Лазерный диод */}
                <div
                  className="absolute left-6 top-1/2 flex items-center gap-1.5 transition-transform duration-200"
                  style={{transform: `translateY(-50%) translateY(${-(laserAngle * 1.2)}px)`}}
                >
                  <div
                    className={`w-12 h-6 rounded flex items-center justify-center text-[9px] font-bold font-mono border ${
                      isLight
                        ? 'bg-white border-emerald-500 text-emerald-700 shadow-xs'
                        : 'bg-slate-800 border-emerald-500 text-emerald-400'
                    }`}
                  >
                    532nm
                  </div>
                </div>

                {/* Стеклянный блок / Призма по центру */}
                <div
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-32 rounded border-2 backdrop-blur-xs flex flex-col items-center justify-between p-1.5 ${
                    isLight
                      ? 'bg-sky-100/60 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                      : 'bg-sky-400/20 border-sky-400/60 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                  }`}
                >
                  <span
                    className={`text-[9px] font-mono font-bold ${
                      isLight ? 'text-sky-900' : 'text-sky-300'
                    }`}
                  >
                    n = {lensIndex}
                  </span>
                  <span
                    className={`text-[8px] font-mono uppercase font-semibold ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {isTg ? 'Шиша' : language === 'ru' ? 'Стекло' : 'Glass'}
                  </span>
                </div>

                {/* Экран фиксации справа */}
                <div
                  className={`absolute right-4 top-1/2 -translate-y-1/2 w-2 h-36 rounded-full border ${
                    isLight
                      ? 'bg-slate-300 border-slate-400'
                      : 'bg-slate-700 border-slate-600'
                  }`}
                />
              </div>

              {/* Управление углом лазера */}
              <div
                className={`rounded-xl border p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-200/90 shadow-xs'
                    : 'bg-slate-950/90 border-slate-800'
                }`}
              >
                <div className="flex-1 w-full">
                  <div
                    className={`flex justify-between text-[11px] font-mono mb-1 ${
                      isLight ? 'text-slate-700 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <span>{isTg ? 'Кунҷи афтиши нур (α):' : language === 'ru' ? 'Угол падения (α):' : 'Angle of incidence (α):'}</span>
                    <span
                      className={`font-black ${
                        isLight ? 'text-emerald-700' : 'text-emerald-400'
                      }`}
                    >
                      {laserAngle}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={laserAngle}
                    onChange={(e) => setLaserAngle(Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-600 bg-slate-200 dark:bg-slate-700"
                  />
                </div>

                <div
                  className={`text-right border-t sm:border-t-0 sm:border-l pt-2 sm:pt-0 sm:pl-3 w-full sm:w-auto ${
                    isLight ? 'border-slate-200 text-slate-700' : 'border-slate-800 text-slate-300'
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold uppercase font-mono ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {isTg ? 'Қонуни Снеллиус:' : language === 'ru' ? 'Закон Снеллиуса:' : "Snell's law:"}
                  </div>
                  <div
                    className={`font-mono font-black text-xs mt-0.5 ${
                      isLight ? 'text-emerald-700' : 'text-emerald-300'
                    }`}
                  >
                    sin(α) / sin(β) = n
                  </div>
                  <div
                    className={`text-[10px] font-medium font-mono ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {isTg ? `Кунҷи шикаст: β ≈ ${refractAngle.toFixed(1)}°` : language === 'ru' ? `Угол преломления: β ≈ ${refractAngle.toFixed(1)}°` : `Refraction angle: β ≈ ${refractAngle.toFixed(1)}°`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Подвал стенда с быстрым переходом */}
        <div
          className={`px-4 py-2.5 border-t flex items-center justify-between text-xs transition-colors ${
            isLight
              ? 'bg-slate-50 border-slate-200/90 text-slate-600'
              : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
          }`}
        >
          <span className="text-[11px] font-medium">
            {isTg ? 'Ҳамаи ҳисобҳо дар браузер иҷро мешаванд' : language === 'ru' ? 'Все расчёты производятся прямо в браузере' : 'All calculations run directly in your browser'}
          </span>
          <button
            onClick={() => {
              selectLab(mode === 'circuit' ? 'circuits-dc' : 'optics');
              setCurrentView('lab');
            }}
            className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
              isLight
                ? 'text-blue-600 hover:text-blue-700'
                : 'text-sky-400 hover:text-sky-300'
            }`}
          >
            <span>{isTg ? 'Ба озмоишгоҳи пурра' : language === 'ru' ? 'Перейти к полному опыту' : 'Open the full experiment'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
