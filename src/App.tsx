/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Главный компонент приложения
 */

import React, {useEffect, useState} from 'react';
import '../web/src/labs/init.ts';
import {Header} from '../web/src/components/Header.tsx';
import {ComponentCatalog} from '../web/src/components/ComponentCatalog.tsx';
import {WorkbenchCanvas} from '../web/src/components/WorkbenchCanvas.tsx';
import {ObservationJournal} from '../web/src/components/ObservationJournal.tsx';
import {GlossaryModal} from '../web/src/components/GlossaryModal.tsx';
import {AccountModal} from '../web/src/components/AccountModal.tsx';
import {LandingPage} from '../web/src/components/LandingPage.tsx';
import {PhotoCircuitAgent} from '../web/src/components/PhotoCircuitAgent/PhotoCircuitAgent.tsx';
import {useLabStore} from '../web/src/store/useLabStore.ts';

export default function App() {
  const {theme, currentView, language} = useLabStore();
  const [mobilePanel, setMobilePanel] = useState<'catalog' | 'workbench' | 'journal'>('workbench');
  const isLight = theme === 'light';
  useEffect(() => {
    // Синхронизация класса dark на <html> для точного контроля темы
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  useEffect(() => {
    // Регистрация сервис-воркера PWA при поддержке браузером
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] Service worker registration ignored:', err);
      });
    }
  }, []);

  return (
    <div
      className={`flex h-[100dvh] min-h-screen w-full min-w-0 flex-col overflow-hidden font-sans select-none transition-colors duration-200 motion-safe:scroll-smooth ${
        isLight ? 'bg-white text-slate-800' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* 1. Верхняя панель (Top Bar Contract: 3 зоны) */}
      <Header />

      {/* 2. Основная рабочая область: Главная страница, фото-агент либо интерактивная лаборатория */}
      {currentView === 'landing' ? (
        <LandingPage />
      ) : currentView === 'photo-agent' ? (
        <PhotoCircuitAgent />
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white/95 p-1.5 dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
            {([
              ['catalog', language === 'tg' ? 'Унсурҳо' : language === 'ru' ? 'Компоненты' : 'Components'],
              ['workbench', language === 'tg' ? 'Мизи корӣ' : language === 'ru' ? 'Монтажный стол' : 'Workbench'],
              ['journal', language === 'tg' ? 'Мушоҳидаҳо' : language === 'ru' ? 'Наблюдения' : 'Observations'],
            ] as const).map(([panel, label]) => (
              <button
                key={panel}
                type="button"
                onClick={() => setMobilePanel(panel)}
                className={`min-h-10 flex-1 rounded-lg px-2 text-xs font-bold transition-all duration-200 ${
                  mobilePanel === panel
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="hidden min-h-0 flex-1 lg:flex">
            <ComponentCatalog />
            <WorkbenchCanvas />
            <ObservationJournal />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden lg:hidden">
            <div className="flex h-full min-h-0 flex-col transition-opacity duration-200">
              {mobilePanel === 'catalog' && <ComponentCatalog />}
              {mobilePanel === 'workbench' && <WorkbenchCanvas />}
              {mobilePanel === 'journal' && <ObservationJournal />}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно научного глоссария с учительской верификацией */}
      <GlossaryModal />

      {/* Модальное окно профиля и входа в аккаунт */}
      <AccountModal />
    </div>
  );
}
