/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Главная страница платформы (Landing Page)
 * Идеальная светлая (чистая типографика, высокий контраст, естественные тени)
 * и тёмная темы без глитчей и инверсий.
 */

import React from 'react';
import {
  Activity,
  ArrowRight,
  Atom,
  Award,
  Battery,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Eye,
  Flame,
  Gauge,
  GraduationCap,
  HelpCircle,
  Languages,
  Layers,
  Lightbulb,
  Microscope,
  Monitor,
  Play,
  School,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  WifiOff,
  Zap,
} from 'lucide-react';
import {useLabStore} from '../store/useLabStore.ts';
import {InteractiveHeroBench} from './InteractiveHeroBench.tsx';
import {Hero3DContainer} from './hero3d/Hero3DContainer.tsx';
import {t} from '../../../shared/i18n.ts';

// Ссылки на фото-витрину реального оборудования лаборатории
const CIRCUIT_SHOWCASE_IMAGE = '/src/assets/images/circuit_optics_showcase_1792867169782.jpg';

export const LandingPage: React.FC = () => {
  const {
    language,
    theme,
    setCurrentView,
    selectLab,
    setAccountOpen,
    setGlossaryOpen,
  } = useLabStore();

  const isLight = theme === 'light';
  const isTg = language === 'tg';

  const handleLaunchLab = (labId?: string) => {
    if (labId) {
      selectLab(labId);
    }
    setCurrentView('lab');
  };

  return (
    <div
      className={`min-h-screen overflow-y-auto font-sans transition-colors duration-200 ${
        isLight ? 'bg-white text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* 1. HERO СЕКЦИЯ ПО ОБРАЗЦУ РЕФЕРЕНСА: КРУПНЫЙ ВЫРАЗИТЕЛЬНЫЙ ЗАГОЛОВОК + ЖИВОЙ СТЕНД */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-20 border-b border-slate-200/80 dark:border-slate-800/80">
        {/* Фоновые деликатные связи и узлы (Atomic graph nodes как в референсе) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35 dark:opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* Левый узел */}
            <circle cx="5%" cy="30%" r="5" fill={isLight ? '#3b82f6' : '#38bdf8'} />
            <circle cx="5%" cy="30%" r="20" stroke={isLight ? '#93c5fd' : '#38bdf8'} strokeWidth="1" fill="none" opacity="0.4" />
            <line x1="5%" y1="30%" x2="18%" y2="50%" stroke={isLight ? '#bfdbfe' : '#bae6fd'} strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="18%" cy="50%" r="7" fill={isLight ? '#2563eb' : '#60a5fa'} />

            {/* Правый узел */}
            <circle cx="92%" cy="40%" r="6" fill={isLight ? '#3b82f6' : '#38bdf8'} />
            <circle cx="92%" cy="40%" r="28" stroke={isLight ? '#93c5fd' : '#38bdf8'} strokeWidth="1" fill="none" opacity="0.3" />
            <line x1="92%" y1="40%" x2="80%" y2="65%" stroke={isLight ? '#bfdbfe' : '#bae6fd'} strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="80%" cy="65%" r="5" fill={isLight ? '#2563eb' : '#60a5fa'} />
          </svg>
        </div>

        {/* Мягкая световая аура */}
        <div
          className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
            isLight ? 'bg-blue-100/60' : 'bg-blue-400/10'
          }`}
        />
        <div
          className={`absolute top-1/3 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
            isLight ? 'bg-amber-100/50' : 'bg-amber-400/5'
          }`}
        />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Левая колонка: Заголовок, описание, кнопки, иконки */}
            <div className="lg:col-span-6 space-y-6">
              {/* Надзаголовок-бейдж */}
              <div
                className={`inline-flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wide ${
                  isLight ? 'text-blue-600' : 'text-sky-400'
                }`}
              >
                <Atom className="w-4 h-4" />
                <span>{t('landing.hero.eyebrow', language)}</span>
              </div>

              {/* Крупный выразительный заголовок в точности как в дизайне референса */}
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-black tracking-tight leading-[1.08]">
                <span className={isLight ? 'text-slate-950' : 'text-white'}>
                  {t('landing.hero.title_part1', language)}
                </span>
                <br />
                <span className={isLight ? 'text-blue-600' : 'text-sky-400'}>
                  {t('landing.hero.title_part2', language)}
                </span>
              </h1>

              {/* Поясняющий подзаголовок */}
              <p
                className={`text-sm sm:text-base leading-relaxed max-w-xl font-normal ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                {t('landing.hero.subtitle', language)}
              </p>

              {/* Главные кнопки действий */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  onClick={() => handleLaunchLab('circuits-dc')}
                  className="px-6 sm:px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm sm:text-base font-bold transition-all shadow-lg shadow-blue-600/25 active:scale-95 flex items-center gap-2.5 group cursor-pointer"
                >
                  <span>{t('landing.nav.open_lab', language)}</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>

                <button
                  onClick={() => setCurrentView('photo-agent')}
                  className="px-5 sm:px-6 py-3.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-amber-500 hover:opacity-95 text-white rounded-xl text-sm sm:text-base font-bold transition-all shadow-lg shadow-indigo-600/25 active:scale-95 flex items-center gap-2 group cursor-pointer"
                >
                  <span>📸</span>
                  <span>{isTg ? 'Агенти акси занҷир' : language === 'ru' ? 'Фото-в-Схему (ИИ)' : 'Photo to Circuit (AI)'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/25 uppercase font-black">
                    Meta AI
                  </span>
                </button>

                <a
                  href="#how-it-works"
                  className={`px-5 sm:px-6 py-3.5 rounded-xl text-sm sm:text-base font-semibold border transition-all active:scale-95 shadow-xs ${
                    isLight
                      ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {t('landing.nav.how_it_works', language)}
                </a>
              </div>

              {/* Нижняя строка 3 ключевых фич платформы (как в референсе) */}
              <div
                className={`flex flex-wrap items-center gap-4 sm:gap-6 pt-5 border-t text-xs sm:text-sm font-semibold ${
                  isLight
                    ? 'border-slate-200 text-slate-700'
                    : 'border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isLight
                        ? 'bg-blue-50 text-blue-600 border-blue-200/70'
                        : 'bg-blue-950/80 text-sky-400 border-blue-800/60'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                  </div>
                  <span>{t('landing.hero.feature1', language)}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isLight
                        ? 'bg-sky-50 text-sky-600 border-sky-200/70'
                        : 'bg-sky-950/80 text-sky-400 border-sky-800/60'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </div>
                  <span>{t('landing.hero.feature2', language)}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isLight
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200/70'
                        : 'bg-indigo-950/80 text-indigo-400 border-indigo-800/60'
                    }`}
                  >
                    <Languages className="w-4 h-4" />
                  </div>
                  <span>{t('landing.hero.feature3', language)}</span>
                </div>
              </div>
            </div>

            {/* Правая колонка: ПРЕМИАЛЬНЫЙ 3D ИНТЕРАКТИВНЫЙ СТЕНД THREE.JS */}
            <div className="lg:col-span-6 flex items-center justify-center">
              <Hero3DContainer />
            </div>
          </div>
        </div>
      </section>

      {/* 2. СЕКЦИЯ: ВОЗМОЖНОСТИ (ИМКОНИЯТҲО) */}
      <section id="features" className="py-16 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              isLight ? 'text-blue-600' : 'text-sky-400'
            }`}
          >
            {isTg ? 'Имкониятҳои платформа' : language === 'ru' ? 'Возможности платформы' : 'Platform features'}
          </span>
          <h2
            className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isTg
              ? 'Таҷрибаи ҳақиқӣ бо технологияи муосир'
              : 'Настоящая физика с цифровой точностью'}
          </h2>
          <p
            className={`text-xs sm:text-sm mt-2 ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            {isTg
              ? 'Ҳисоби дақиқи ҷараён ва шиддат бо усули потенсиалҳои гиреҳӣ, муаллими соҳибзеҳн ва кор бидуни интернет.'
              : 'Физически корректный расчет узловых потенциалов, сократический ИИ-наставник и полная автономная работа в школах.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            className={`p-6 rounded-2xl border transition-all ${
              isLight
                ? 'bg-white border-slate-200/90 hover:border-blue-400 shadow-sm hover:shadow-md'
                : 'bg-slate-900/60 border-slate-800 hover:border-sky-500'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                isLight ? 'bg-blue-50 text-blue-600 border border-blue-200/70' : 'bg-blue-950 text-sky-400'
              }`}
            >
              <Zap className="w-5 h-5" />
            </div>
            <h3 className={`text-sm font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {isTg ? 'Ҳисоби физикии Nodal' : language === 'ru' ? 'Честный расчёт цепей' : 'Accurate circuit calculations'}
            </h3>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {isTg
                ? 'Ҷараён, шиддат ва тавоноӣ аз рӯи қонунҳои воқеии Кирхгоф ва Ом бо ҳалкунандаи матритсавӣ ҳисоб карда мешаванд.'
                : 'Показания приборов рассчитываются матричным методом узловых потенциалов в реальном времени.'}
            </p>
          </div>

          <div
            className={`p-6 rounded-2xl border transition-all ${
              isLight
                ? 'bg-white border-slate-200/90 hover:border-blue-400 shadow-sm hover:shadow-md'
                : 'bg-slate-900/60 border-slate-800 hover:border-sky-500'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                isLight ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/70' : 'bg-indigo-950 text-indigo-400'
              }`}
            >
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className={`text-sm font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {isTg ? 'ИИ-наставники суқротӣ' : language === 'ru' ? 'Сократический ИИ-наставник' : 'Socratic AI tutor'}
            </h3>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {isTg
                ? 'Натиҷаи тайёрро намедиҳад, балки бо саволҳои роҳнамо фикрронии мустақилонаро меомӯзад.'
                : 'Не подсказывает готовый ответ, а наводящими вопросами подталкивает школьника к открытию закона.'}
            </p>
          </div>

          <div
            className={`p-6 rounded-2xl border transition-all ${
              isLight
                ? 'bg-white border-slate-200/90 hover:border-blue-400 shadow-sm hover:shadow-md'
                : 'bg-slate-900/60 border-slate-800 hover:border-sky-500'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                isLight ? 'bg-amber-50 text-amber-600 border border-amber-200/70' : 'bg-amber-950 text-amber-400'
              }`}
            >
              <WifiOff className="w-5 h-5" />
            </div>
            <h3 className={`text-sm font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {isTg ? 'Оффлайн-реҷаи PWA' : language === 'ru' ? 'Работает без интернета' : 'Works offline'}
            </h3>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {isTg
                ? 'Ҳатто ҳангоми набудани интернет дар синфхонаҳо симулятор ва луғати илмӣ бемамониат кор мекунанд.'
                : 'Сервис-воркер PWA кэширует симулятор и заготовленные подсказки для школ без стабильной связи.'}
            </p>
          </div>

          <div
            className={`p-6 rounded-2xl border transition-all ${
              isLight
                ? 'bg-white border-slate-200/90 hover:border-blue-400 shadow-sm hover:shadow-md'
                : 'bg-slate-900/60 border-slate-800 hover:border-sky-500'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                isLight ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/70' : 'bg-emerald-950 text-emerald-400'
              }`}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className={`text-sm font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {isTg ? 'Луғати санҷидашуда' : language === 'ru' ? 'Верифицированный словарь' : 'Verified glossary'}
            </h3>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {isTg
                ? 'Истилоҳоти физика ба забони тоҷикӣ мувофиқи қоидаҳои таълимӣ ва бо тасдиқи омӯзгорони ботаҷриба.'
                : 'Точные физические и электротехнические термины на таджикском и русском с учительской модерацией.'}
            </p>
          </div>
        </div>
      </section>

      {/* 3. СЕКЦИЯ: ДЛЯ КОГО (БАРОИ КӢ) */}
      <section
        id="audience"
        className={`py-16 border-t ${
          isLight
            ? 'bg-slate-50/70 border-slate-200/80'
            : 'bg-slate-900/40 border-slate-800'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-blue-600' : 'text-sky-400'
              }`}
            >
              {isTg ? 'Барои кӣ омода шудааст?' : 'Для кого создана лаборатория'}
            </span>
            <h2
              className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {isTg
                ? 'Қарор барои мактабҳо, хонандагон ва муаллимон'
                : 'Решение для школ, учеников и учителей'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className={`p-6 rounded-2xl border transition-all ${
                isLight
                  ? 'bg-white border-slate-200/90 shadow-sm'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  isLight ? 'bg-blue-50 text-blue-600 border border-blue-200/70' : 'bg-blue-950 text-sky-400'
                }`}
              >
                <Users className="w-6 h-6" />
              </div>
              <h3 className={`text-base font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isTg ? 'Барои хонандагони 8–11 синф' : 'Для школьников 8–11 классов'}
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isTg
                  ? 'Ҷамъоварии бехатари занҷирҳо дар хона ё мактаб, бе хатари сӯхтани сим ва бо фаҳмиши ҳақиқии формулаҳои физикӣ.'
                  : 'Безопасные опыты дома и на уроках, подготовка к олимпиадам и экзаменам без страха сломать дорогое оборудование.'}
              </p>
            </div>

            <div
              className={`p-6 rounded-2xl border transition-all ${
                isLight
                  ? 'bg-white border-slate-200/90 shadow-sm'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  isLight ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/70' : 'bg-emerald-950 text-emerald-400'
                }`}
              >
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className={`text-base font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isTg ? 'Барои омӯзгорони физика' : 'Для учителей физики'}
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isTg
                  ? 'Нишон додани таҷрибаҳои интерактивӣ дар проектор ё тахтаи электронӣ ва пайгирии дақиқи қадамҳои ҳар як хонанда.'
                  : 'Демонстрация законов на интерактивной доске, готовые сценарии уроков и автоматический контроль выполнения шагов.'}
              </p>
            </div>

            <div
              className={`p-6 rounded-2xl border transition-all ${
                isLight
                  ? 'bg-white border-slate-200/90 shadow-sm'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  isLight ? 'bg-amber-50 text-amber-600 border border-amber-200/70' : 'bg-amber-950 text-amber-400'
                }`}
              >
                <School className="w-6 h-6" />
              </div>
              <h3 className={`text-base font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isTg ? 'Барои мактабҳо ва литсейҳо' : 'Для лицеев и школ'}
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isTg
                  ? 'Озмоишгоҳи муосир бидуни хароҷоти зиёд барои маводҳои масрафӣ ва таҷҳизоти гаронбаҳои физикӣ.'
                  : 'Оснащение кабинетов естественных наук виртуальной практической базой, доступной на любом компьютере.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. СЕКЦИЯ: ЭКСПЕРИМЕНТЫ И СТАТУС ГОТОВНОСТИ ТЕМ */}
      <section id="experiments" className="py-16 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              isLight ? 'text-blue-600' : 'text-sky-400'
            }`}
          >
            {isTg ? 'Озмоишҳо ва модулҳои фаъол' : 'Эксперименты и темы исследований'}
          </span>
          <h2
            className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isTg
              ? 'Кадом озмоишгоҳҳо ҳозир фаъоланд?'
              : 'Готовые лаборатории для практических работ'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Цепи тока */}
          <div
            className={`rounded-2xl border p-6 flex flex-col justify-between transition-all hover:scale-[1.01] ${
              isLight
                ? 'bg-white border-slate-200/90 hover:border-blue-500 shadow-sm hover:shadow-md'
                : 'bg-slate-900 border-slate-800 hover:border-blue-500'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    isLight
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {isTg ? '100% ОМОДА АСТ' : '100% ГОТОВО'}
                </span>
                <span className="text-xs font-bold font-mono text-slate-500">8–10 кл.</span>
              </div>

              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  isLight ? 'bg-blue-50 text-blue-600 border border-blue-200/70' : 'bg-blue-950/80 text-sky-400'
                }`}
              >
                <Zap className="w-6 h-6" />
              </div>

              <h3 className={`text-base font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isTg ? 'Занҷирҳои ҷараёни доимӣ' : 'Цепи постоянного тока'}
              </h3>
              <p className={`text-xs leading-relaxed mb-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isTg
                  ? 'Қонуни Ом, пайвасти пайдарпай ва мутавозӣ, лампаи тафсон, батарея ва асбобҳои ченак.'
                  : 'Закон Ома, последовательное и параллельное включение, короткое замыкание, лампа и вольтметр.'}
              </p>
            </div>

            <button
              onClick={() => handleLaunchLab('circuits-dc')}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{isTg ? 'Оғози озмоиш' : 'Открыть лабораторию'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Оптика */}
          <div
            className={`rounded-2xl border p-6 flex flex-col justify-between transition-all hover:scale-[1.01] ${
              isLight
                ? 'bg-white border-slate-200/90 hover:border-amber-500 shadow-sm hover:shadow-md'
                : 'bg-slate-900 border-slate-800 hover:border-amber-500'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    isLight
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {isTg ? 'МОДУЛ ФАЪОЛ АСТ' : 'МОДУЛЬ ГОТОВ'}
                </span>
                <span className="text-xs font-bold font-mono text-slate-500">8–9 кл.</span>
              </div>

              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  isLight ? 'bg-amber-50 text-amber-600 border border-amber-200/70' : 'bg-amber-950/80 text-amber-400'
                }`}
              >
                <Compass className="w-6 h-6" />
              </div>

              <h3 className={`text-base font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isTg ? 'Оптикаи геометрӣ ва нур' : 'Геометрическая оптика'}
              </h3>
              <p className={`text-xs leading-relaxed mb-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isTg
                  ? 'Шикаст ва инъикоси нури лазер, линзаҳои фурӯзон ва парокандакунанда, қонуни Снеллиус.'
                  : 'Преломление луча, закон Снеллиуса, линзы, призмы и расчет фокусного расстояния.'}
              </p>
            </div>

            <button
              onClick={() => handleLaunchLab('optics-geometric')}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{isTg ? 'Оғози озмоиш' : 'Открыть оптику'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Микроскопия */}
          <div
            className={`rounded-2xl border p-6 flex flex-col justify-between transition-all hover:scale-[1.01] ${
              isLight
                ? 'bg-white border-slate-200/90 hover:border-emerald-500 shadow-sm hover:shadow-md'
                : 'bg-slate-900 border-slate-800 hover:border-emerald-500'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    isLight
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {isTg ? 'МОДУЛ ФАЪОЛ АСТ' : 'МОДУЛЬ ГОТОВ'}
                </span>
                <span className="text-xs font-bold font-mono text-slate-500">9–11 кл.</span>
              </div>

              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  isLight ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/70' : 'bg-emerald-950/80 text-emerald-400'
                }`}
              >
                <Microscope className="w-6 h-6" />
              </div>

              <h3 className={`text-base font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isTg ? 'Микроскопия ва ҳуҷайрашиносӣ' : 'Микроскопия и цитология'}
              </h3>
              <p className={`text-xs leading-relaxed mb-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isTg
                  ? 'Сохти ҳуҷайраи растанӣ, микропрепаратҳо, линзаҳои микроскоп ва калонкунӣ то 1000x.'
                  : 'Исследование клеток растений и животных, виртуальный микроскоп с зумом до 1000x.'}
              </p>
            </div>

            <button
              onClick={() => handleLaunchLab('biology-microscopy')}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{isTg ? 'Оғози озмоиш' : 'Открыть микроскоп'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. СЕКЦИЯ: КАК ЭТО РАБОТАЕТ (ЧӢ ТАВР КОР МЕКУНАД) */}
      <section
        id="how-it-works"
        className={`py-16 border-t ${
          isLight
            ? 'bg-slate-50/70 border-slate-200/80'
            : 'bg-slate-900/40 border-slate-800'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-blue-600' : 'text-sky-400'
              }`}
            >
              {isTg ? 'Қадам ба қадам' : 'Простой процесс'}
            </span>
            <h2
              className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {isTg ? 'Чӣ тавр дар Озмо Лаб таҷриба мегузаронанд?' : 'Как это работает?'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              className={`text-center p-6 space-y-3 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md shadow-blue-500/30">
                1
              </div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isTg ? 'Унсурҳоро интихоб кунед' : 'Выберите приборы'}
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isTg
                  ? 'Манбаъҳои барқ, лампаҳо, калид ва асбобҳои ченакро ба мизи озмоишӣ илова кунед.'
                  : 'Перетащите батарею, резисторы, ключ и приборы из каталога на монтажный стол.'}
              </p>
            </div>

            <div
              className={`text-center p-6 space-y-3 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md shadow-indigo-500/30">
                2
              </div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isTg ? 'Симҳоро пайваст намоед' : 'Соедините цепь'}
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isTg
                  ? 'Бо пахши терминалҳо сим кашед ва калидро пӯшед, то ҷараёни барқ ба ҳаракат ояд.'
                  : 'Соедините контакты проводами в один клик и замкните выключатель.'}
              </p>
            </div>

            <div
              className={`text-center p-6 space-y-3 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                3
              </div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isTg ? 'Натиҷаро омӯзед ва пурсед' : 'Получите анализ ИИ'}
              </h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isTg
                  ? 'Нишондоди приборҳоро бинед ва аз ИИ-муаллим маслиҳат ё тафтиши схемаро дархост кунед.'
                  : 'Наблюдайте реальные показания амперметра и обратитесь к ИИ-наставнику за подсказкой.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. УЧЕБНЫЙ ПЛАН (БАРНОМАИ ТАЪЛИМӢ) */}
      <section id="curriculum" className="py-16 max-w-7xl mx-auto px-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-blue-600' : 'text-sky-400'
              }`}
            >
              {isTg ? 'Барномаи таълимӣ' : 'Учебный план'}
            </span>
            <h2
              className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {isTg ? 'Мавзӯъҳо аз рӯи синфҳои мактабӣ' : 'Темы исследований для 8–11 классов'}
            </h2>
          </div>

          <button
            onClick={() => handleLaunchLab('circuits-dc')}
            className="self-start sm:self-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>{isTg ? 'Ба озмоишгоҳ' : 'Открыть симулятор'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`p-5 rounded-2xl border transition-all ${
              isLight
                ? 'bg-white border-slate-200/90 shadow-sm'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                  isLight ? 'bg-blue-50 text-blue-700 border border-blue-200/70' : 'bg-blue-950 text-blue-300'
                }`}
              >
                8 {isTg ? 'синф' : 'класс'}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">4 {isTg ? 'мавзӯъ' : 'темы'}</span>
            </div>
            <h3 className={`text-sm font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {isTg ? 'Асосҳои ҷараёни барқ' : 'Основы электричества'}
            </h3>
            <ul className={`text-xs space-y-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 font-bold">•</span>
                <span>{isTg ? 'Сарчашмаҳои ҷараён ва занҷир' : 'Источники тока и простая цепь'}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 font-bold">•</span>
                <span>{isTg ? 'Қонуни Ом: I = U / R' : 'Закон Ома для участка цепи'}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 font-bold">•</span>
                <span>{isTg ? 'Ченкунӣ бо амперметр ва волтметр' : 'Измерение тока и напряжения'}</span>
              </li>
            </ul>
          </div>

          <div
            className={`p-5 rounded-2xl border transition-all ${
              isLight
                ? 'bg-white border-slate-200/90 shadow-sm'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                  isLight ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70' : 'bg-indigo-950 text-indigo-300'
                }`}
              >
                9 {isTg ? 'синф' : 'класс'}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">5 {isTg ? 'мавзӯъ' : 'тем'}</span>
            </div>
            <h3 className={`text-sm font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {isTg ? 'Пайвасти ноқилҳо ва оптика' : 'Соединение проводников'}
            </h3>
            <ul className={`text-xs space-y-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <li className="flex items-start gap-1.5">
                <span className="text-indigo-500 font-bold">•</span>
                <span>{isTg ? 'Пайвасти пайдарпайи резисторҳо' : 'Последовательное соединение'}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-indigo-500 font-bold">•</span>
                <span>{isTg ? 'Пайвасти мутавозии шохаҳо' : 'Параллельное соединение'}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-indigo-500 font-bold">•</span>
                <span>{isTg ? 'Шикасти нур дар линзаҳо' : 'Преломление света в линзах'}</span>
              </li>
            </ul>
          </div>

          <div
            className={`p-5 rounded-2xl border transition-all ${
              isLight
                ? 'bg-white border-slate-200/90 shadow-sm'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                  isLight ? 'bg-amber-50 text-amber-700 border border-amber-200/70' : 'bg-amber-950 text-amber-300'
                }`}
              >
                10 {isTg ? 'синф' : 'класс'}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">4 {isTg ? 'мавзӯъ' : 'темы'}</span>
            </div>
            <h3 className={`text-sm font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {isTg ? 'Электромагнетизм ва қувва' : 'Электродинамика и ЭДС'}
            </h3>
            <ul className={`text-xs space-y-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500 font-bold">•</span>
                <span>{isTg ? 'Қонуни Ом барои занҷири пурра' : 'Закон Ома для полной цепи'}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500 font-bold">•</span>
                <span>{isTg ? 'Муқовимати дарунии батарея' : 'Внутреннее сопротивление'}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500 font-bold">•</span>
                <span>{isTg ? 'Тавоноии барқӣ: P = I · U' : 'Мощность и закон Джоуля'}</span>
              </li>
            </ul>
          </div>

          <div
            className={`p-5 rounded-2xl border transition-all ${
              isLight
                ? 'bg-white border-slate-200/90 shadow-sm'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                  isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70' : 'bg-emerald-950 text-emerald-300'
                }`}
              >
                11 {isTg ? 'синф' : 'класс'}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">3 {isTg ? 'мавзӯъ' : 'темы'}</span>
            </div>
            <h3 className={`text-sm font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {isTg ? 'Оптика ва микросохтҳо' : 'Оптика и квантовая физика'}
            </h3>
            <ul className={`text-xs space-y-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{isTg ? 'Дисперсия ва инъикоси куллӣ' : 'Дисперсия и преломление'}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{isTg ? 'Асбобҳои мураккаби оптикӣ' : 'Оптические системы'}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{isTg ? 'Сохти ҳуҷайра дар биология' : 'Клеточные микроструктуры'}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 7. ФОТО-ВИТРИНА ОБОРУДОВАНИЯ (БЕЗ ФЕЙКОВЫХ НОУТБУКОВ) */}
      <section
        className={`py-16 border-t ${
          isLight
            ? 'bg-slate-50/70 border-slate-200/80'
            : 'bg-slate-900/40 border-slate-800'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div
              className={`lg:col-span-6 relative rounded-3xl overflow-hidden border shadow-xl group ${
                isLight ? 'border-slate-200/90 shadow-slate-200/50' : 'border-slate-800 shadow-sky-950/20'
              }`}
            >
              <img
                src={CIRCUIT_SHOWCASE_IMAGE}
                alt="Лабораторный стенд цепей постоянного тока"
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                <div className="text-white space-y-1">
                  <span className="text-xs font-bold uppercase text-amber-400">
                    {isTg ? 'Таҷҳизоти ҳақиқӣ дар экрани шумо' : 'Прецизионное оборудование на экране'}
                  </span>
                  <p className="text-sm font-semibold">
                    {isTg
                      ? 'Лампаи тафсон, батареяи 9V ва мултиметри рақамӣ'
                      : 'Лампа накаливания, батарея 9V и цифровой мультиметр'}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isLight ? 'text-amber-700' : 'text-amber-400'
                }`}
              >
                {isTg ? 'Бехатарӣ ва самаранокӣ' : 'Преимущества платформы'}
              </span>

              <h2
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                {isTg
                  ? 'Таҷрибаҳои бехатар бидуни хатари сӯхтани симҳо'
                  : 'Безопасные эксперименты без риска испортить приборы'}
              </h2>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isLight
                        ? 'bg-amber-50 text-amber-600 border-amber-200/70'
                        : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {isTg ? 'Бехатарии комил ҳангоми хатогиҳо' : 'Абсолютная безопасность'}
                    </h4>
                    <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {isTg
                        ? 'Ҳангоми кӯтоҳпайвастшавӣ система сабаби физикиро фаҳмонад, бидуни зарар ба таҷҳизоти воқеӣ.'
                        : 'При коротком замыкании система мягко информирует о перегрузке, позволяя безопасно ошибаться.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isLight
                        ? 'bg-blue-50 text-blue-600 border-blue-200/70'
                        : 'bg-blue-950/60 text-sky-400 border-blue-800/60'
                    }`}
                  >
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {isTg ? 'Фаъолият бидуни интернет (Оффлайн PWA)' : 'Работает без интернета (PWA)'}
                    </h4>
                    <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {isTg
                        ? 'Дар мактабҳои ноҳияҳо ва деҳот ҳатто ҳангоми қатъ шудани интернет тамоми симулятсия кор мекунад.'
                        : 'Даже при слабой или отсутствующей связи симулятор и локальный наставник остаются полностью активными.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. ПОДВАЛ (Footer) */}
      <footer
        className={`border-t py-10 transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span
              className={`text-base font-black tracking-tight ${
                isLight ? 'text-blue-600' : 'text-sky-400'
              }`}
            >
              Озмо Лаб / Ozmo Lab
            </span>
            <span className="text-xs text-slate-500">
              © {new Date().getFullYear()} STEM Таълими Тоҷикистон.
            </span>
          </div>

          <div className="flex items-center gap-5 text-xs font-semibold">
            <button
              onClick={() => handleLaunchLab('circuits-dc')}
              className={`transition-colors cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-blue-600' : 'text-slate-400 hover:text-sky-400'
              }`}
            >
              {isTg ? 'Озмоишгоҳ' : language === 'ru' ? 'Лаборатория' : 'Laboratory'}
            </button>
            <button
              onClick={() => setGlossaryOpen(true)}
              className={`transition-colors cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-blue-600' : 'text-slate-400 hover:text-sky-400'
              }`}
            >
              {isTg ? 'Луғат' : language === 'ru' ? 'Глоссарий' : 'Glossary'}
            </button>
            <button
              onClick={() => setAccountOpen(true)}
              className={`transition-colors cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-blue-600' : 'text-slate-400 hover:text-sky-400'
              }`}
            >
              {isTg ? 'Ҳисоби ман' : language === 'ru' ? 'Аккаунт' : 'Account'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
