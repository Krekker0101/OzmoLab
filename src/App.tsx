/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Главный компонент приложения
 */

import React, {useEffect} from 'react';
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
  const {theme, currentView} = useLabStore();
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
      className={`flex min-h-screen w-full flex-col overflow-hidden font-sans select-none transition-colors duration-200 motion-safe:scroll-smooth ${
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
        <div className="flex-1 flex min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-hidden lg:flex-row lg:overflow-hidden">
          {/* Левая колонка: Каталог элементов и Уроки */}
          <ComponentCatalog />

          {/* Центральная колонка: 2D Монтажный стол симулятора */}
          <WorkbenchCanvas />

          {/* Правая колонка: Телеметрия и ИИ-наставник */}
          <ObservationJournal />
        </div>
      )}

      {/* Модальное окно научного глоссария с учительской верификацией */}
      <GlossaryModal />

      {/* Модальное окно профиля и входа в аккаунт */}
      <AccountModal />
    </div>
  );
}
