/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Верхняя панель навигации (Top Bar Contract)
 */

import React, {useState, useEffect} from 'react';
import {BookOpen, FlaskConical, Globe, Home, Moon, Sparkles, Sun, User, Wifi, WifiOff} from 'lucide-react';
import {useLabStore} from '../store/useLabStore.ts';
import {t} from '../../../shared/i18n.ts';
import {LabRegistry} from '../labs/registry.ts';
import {LanguageSwitcher} from './LanguageSwitcher.tsx';

export const Header: React.FC = () => {
  const {
    language,
    setLanguage,
    activeLabId,
    selectLab,
    setGlossaryOpen,
    theme,
    toggleTheme,
    currentView,
    setCurrentView,
    setAccountOpen,
    userProfile,
    is3DModeEnabled,
    toggle3DMode,
  } = useLabStore();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const allLabs = LabRegistry.getAll();
  const isLight = theme === 'light';

  return (
    <header
      className={`flex items-center justify-between gap-4 lg:gap-8 px-4 lg:px-6 py-2.5 border-b shrink-0 transition-colors duration-200 ${
        isLight
          ? 'bg-white/95 border-slate-200/90 text-slate-800 shadow-xs backdrop-blur-xs'
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}
    >
      {/* Зона 1: Название платформы и переключатель Главная / Лаборатория */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setCurrentView('landing')}
          className={`flex items-center gap-2 text-left group transition-all`}
          title={t('nav.home', language)}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white font-black shadow-sm group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div>
            <div
              className={`text-base font-bold tracking-tight leading-tight transition-colors whitespace-nowrap ${
                isLight ? 'text-slate-900 group-hover:text-sky-600' : 'text-white group-hover:text-sky-400'
              }`}
            >
              {t('app.name', language)}
            </div>
            <div
              className={`text-[10px] hidden sm:block font-medium leading-none ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              STEM Virtual Lab
            </div>
          </div>
        </button>
      </div>

      {/* Зона 2: Навигация */}
      {currentView === 'landing' ? (
        /* Ссылки лендинга точно как в скриншоте пользователя */
        <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold">
          <a
            href="#features"
            className={`transition-colors hover:text-sky-600 ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {t('landing.nav.features', language)}
          </a>
          <a
            href="#audience"
            className={`transition-colors hover:text-sky-600 ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {t('landing.nav.audience', language)}
          </a>
          <a
            href="#experiments"
            className={`transition-colors hover:text-sky-600 ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {t('landing.nav.experiments', language)}
          </a>
          <a
            href="#how-it-works"
            className={`transition-colors hover:text-sky-600 ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {t('landing.nav.how_it_works', language)}
          </a>
          <a
            href="#curriculum"
            className={`transition-colors hover:text-sky-600 ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {t('landing.nav.curriculum', language)}
          </a>
          <button
            onClick={() => setCurrentView('photo-agent')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-gradient-to-r from-sky-500/10 to-indigo-500/10 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:scale-105 transition-all shadow-xs"
          >
            <span>📸</span>
            <span>{language === 'tg' ? 'Агенти акси занҷир (ИИ)' : language === 'ru' ? 'Фото-в-Схему (ИИ)' : 'Photo to Circuit (AI)'}</span>
          </button>
          <button
            onClick={() => setGlossaryOpen(true)}
            className={`flex items-center gap-1 transition-colors hover:text-sky-600 ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('glossary.btn.open', language)}</span>
          </button>
        </nav>
      ) : (
        /* Панель лаборатории при работе с монтажным столом */
        <nav className="flex items-center gap-2 overflow-x-auto py-1">
          <div
            className={`flex items-center p-0.5 rounded-lg border transition-colors ${
              isLight
                ? 'bg-slate-100/90 border-slate-200/80 shadow-inner'
                : 'bg-slate-800/80 border-slate-700/60'
            }`}
          >
            {allLabs.map((lab) => {
              const isActive = lab.id === activeLabId;
              return (
                <button
                  key={lab.id}
                  onClick={() => {
                    selectLab(lab.id);
                    setCurrentView('lab');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? isLight
                        ? 'bg-white text-sky-600 shadow-xs border border-slate-200/60'
                        : 'bg-sky-600 text-white shadow-xs'
                      : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {t(lab.titleKey, language)}
                </button>
              );
            })}
          </div>

          <button
            onClick={toggle3DMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all whitespace-nowrap shrink-0 active:scale-95 ${
              is3DModeEnabled
                ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-xs'
                : isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title={language === 'en' ? 'Toggle 3D scene' : language === 'ru' ? 'Переключить 3D сцену' : 'Гузариши саҳнаи 3D'}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>3D</span>
          </button>

          <button
            onClick={() => setCurrentView('photo-agent')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition-all whitespace-nowrap shrink-0 ${
              currentView === 'photo-agent'
                ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-xs border-transparent'
                : isLight
                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
                  : 'bg-sky-950/60 hover:bg-sky-900/70 text-sky-300 border-sky-800'
            }`}
          >
            <span>📸</span>
            <span>{language === 'tg' ? 'Агенти акси занҷир' : language === 'ru' ? 'Фото-в-Схему (ИИ)' : 'Photo to Circuit (AI)'}</span>
          </button>

          <button
            onClick={() => setGlossaryOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap shrink-0 ${
              isLight
                ? 'bg-slate-100/90 hover:bg-slate-200/70 text-slate-700 border-slate-200 hover:border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/70'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">{t('glossary.btn.open', language)}</span>
          </button>
        </nav>
      )}

      {/* Зона 3: Языки, Тема, Аккаунт и Яркая кнопка «Открыть лабораторию →» */}
      <div className="flex items-center gap-2 lg:gap-3 shrink-0">
        {/* Компонент переключения языков TG / RU */}
        <LanguageSwitcher />

        {/* Кнопка смены темы (Светлая / Тёмная) */}
        <button
          onClick={toggleTheme}
          className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
            isLight
              ? 'bg-amber-50/80 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-xs'
              : 'bg-slate-800 border-slate-700 text-sky-400 hover:bg-slate-700'
          }`}
          title={isLight ? t('theme.dark', language) : t('theme.light', language)}
          aria-label={t('theme.toggle', language)}
        >
          {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Кнопка Аккаунта пользователя */}
        <button
          onClick={() => setAccountOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700'
              : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
          title={t('nav.account', language)}
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
            {userProfile.name.charAt(0)}
          </div>
          <span className="hidden xl:inline font-medium">{userProfile.name}</span>
        </button>

        {/* Главная кнопка действия «Открыть лабораторию →» как в референсе */}
        {currentView === 'landing' ? (
          <button
            onClick={() => {
              selectLab('circuits-dc');
              setCurrentView('lab');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-md hover:shadow-lg shadow-blue-600/25 transition-all group"
          >
            <span>{t('landing.nav.open_lab', language)}</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentView('landing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-sky-500" />
            <span>{t('nav.home', language)}</span>
          </button>
        )}
      </div>
    </header>
  );
};
