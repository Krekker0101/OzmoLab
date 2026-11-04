/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Левая панель: Каталог компонентов и практикум уроков
 */

import React, {useState} from 'react';
import {
  Activity,
  BatteryCharging,
  CheckCircle2,
  ChevronRight,
  Gauge,
  HelpCircle,
  Lightbulb,
  Plus,
  Square,
  ToggleRight,
  Zap,
  BookOpen,
} from 'lucide-react';
import {useLabStore} from '../store/useLabStore.ts';
import {t} from '../../../shared/i18n.ts';

export const ComponentCatalog: React.FC = () => {
  const {
    language,
    theme,
    activeLab,
    addComponent,
    activeLessonId,
    activeStepIndex,
    selectLesson,
    checkLessonStep,
    nextLessonStep,
    stepValidationMessage,
  } = useLabStore();

  const [activeTab, setActiveTab] = useState<'components' | 'lessons'>('components');
  const isLight = theme === 'light';

  const getIcon = (type: string) => {
    switch (type) {
      case 'battery':
        return <BatteryCharging className="w-5 h-5 text-amber-500" />;
      case 'resistor':
        return <Activity className="w-5 h-5 text-sky-500" />;
      case 'lamp':
        return <Lightbulb className="w-5 h-5 text-yellow-500" />;
      case 'switch':
        return <ToggleRight className="w-5 h-5 text-emerald-500" />;
      case 'ammeter':
        return <Gauge className="w-5 h-5 text-purple-500" />;
      case 'voltmeter':
        return <Zap className="w-5 h-5 text-rose-500" />;
      default:
        return <Square className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({type}));
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const activeLesson =
    activeLab.lessons.find((l) => l.id === activeLessonId) || activeLab.lessons[0];
  const currentStep = activeLesson?.steps[activeStepIndex];

  return (
    <aside
      className={`w-full max-h-[42vh] min-h-[220px] flex flex-col shrink-0 border-b transition-colors duration-200 lg:h-auto lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r ${
        isLight
          ? 'bg-white border-slate-200/90 text-slate-800'
          : 'bg-slate-900/95 border-slate-800 text-slate-200'
      }`}
    >
      {/* Вкладки переключения: Каталог / Уроки */}
      <div
        className={`flex border-b p-2 gap-1.5 ${
          isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950/60 border-slate-800'
        }`}
      >
        <button
          onClick={() => setActiveTab('components')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'components'
              ? isLight
                ? 'bg-white text-sky-600 shadow-xs border border-slate-200/60'
                : 'bg-slate-800 text-white shadow-sm'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          {t('catalog.components', language)}
        </button>
        <button
          onClick={() => setActiveTab('lessons')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'lessons'
              ? isLight
                ? 'bg-white text-sky-600 shadow-xs border border-slate-200/60'
                : 'bg-slate-800 text-white shadow-sm'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          {t('catalog.lessons', language)}
        </button>
      </div>

      {/* Вкладка 1: Палитра компонентов с Drag and Drop */}
      {activeTab === 'components' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          <p
            className={`text-[11px] px-1 font-medium ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {t('catalog.drag_hint', language)}
          </p>

          <div className="space-y-2">
            {activeLab.components.map((comp) => (
              <div
                key={comp.type}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, comp.type)}
                className={`group p-3 rounded-xl border transition-all flex items-center justify-between cursor-grab active:cursor-grabbing hover:scale-[1.01] ${
                  isLight
                    ? 'bg-slate-50/80 hover:bg-white border-slate-200/80 hover:border-sky-400 shadow-2xs hover:shadow-xs'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-sky-500/50'
                }`}
                title={language === 'tg' ? 'Кашед ва ба мизи корӣ гузоред' : language === 'ru' ? 'Перетащите на монтажный стол' : 'Drag to the workbench'}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg border shrink-0 transition-transform group-hover:scale-105 ${
                      isLight
                        ? 'bg-white border-slate-200 shadow-2xs'
                        : 'bg-slate-900 border-slate-700/80'
                    }`}
                  >
                    {getIcon(comp.type)}
                  </div>
                  <div>
                    <h4
                      className={`text-xs font-bold leading-tight ${
                        isLight ? 'text-slate-900' : 'text-slate-100'
                      }`}
                    >
                      {t(comp.nameKey, language)}
                    </h4>
                    <span
                      className={`text-[10px] block mt-0.5 ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {comp.terminals.length > 0
                        ? `${comp.terminals.length} ${language === 'tg' ? 'нуқта' : language === 'ru' ? 'контакта' : 'terminals'}`
                        : language === 'tg'
                          ? 'Унсури ғайрифаъол'
                          : language === 'ru' ? 'Пассивный элемент' : 'Passive component'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => addComponent(comp.type)}
                    className={`p-1.5 rounded-lg border transition-all active:scale-90 ${
                      isLight
                        ? 'bg-sky-50 hover:bg-sky-600 text-sky-600 hover:text-white border-sky-200 shadow-2xs'
                        : 'bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white border-sky-700/50'
                    }`}
                    title="Илова кардан / Добавить"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Вкладка 2: Практикум и шаги урока */}
      {activeTab === 'lessons' && (
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col justify-between">
          <div className="space-y-3.5">
            {/* Селектор урока */}
            <div>
              <label
                className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {language === 'tg' ? 'Кори лабораторӣ' : language === 'ru' ? 'Лабораторная работа' : 'Laboratory exercise'}
              </label>
              <select
                value={activeLessonId || ''}
                onChange={(e) => selectLesson(e.target.value)}
                className={`w-full text-xs rounded-xl p-2.5 border outline-none font-medium transition-all ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-800 focus:ring-2 focus:ring-sky-500 shadow-2xs'
                    : 'bg-slate-800 border-slate-700 text-slate-200 focus:ring-1 focus:ring-sky-500'
                }`}
              >
                {activeLab.lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {t(lesson.titleKey, language)} ({lesson.gradeLevel}{' '}
                    {language === 'tg' ? 'с.' : language === 'ru' ? 'кл.' : 'grade'})
                  </option>
                ))}
              </select>
            </div>

            {/* Карточка текущего шага */}
            {currentStep && (
              <div
                className={`p-4 rounded-2xl border space-y-3 transition-all ${
                  isLight
                    ? 'bg-slate-50/90 border-slate-200 shadow-xs'
                    : 'bg-slate-800/80 border-slate-700/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-sky-600">
                  <span>
                    {t('lesson.step', language)} {currentStep.stepNumber} /{' '}
                    {activeLesson?.steps.length}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                      isLight
                        ? 'bg-sky-100 text-sky-700 border-sky-200'
                        : 'bg-sky-950/80 text-sky-300 border-sky-800/50'
                    }`}
                  >
                    {t('lesson.level', language)} {activeLesson?.gradeLevel}
                  </span>
                </div>

                <h3
                  className={`text-sm font-bold ${
                    isLight ? 'text-slate-900' : 'text-slate-100'
                  }`}
                >
                  {t(currentStep.titleKey, language)}
                </h3>

                <p
                  className={`text-xs leading-relaxed ${
                    isLight ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  {t(currentStep.instructionKey, language)}
                </p>

                <div
                  className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${
                    isLight
                      ? 'bg-amber-50/80 border-amber-200 text-amber-800'
                      : 'bg-slate-900/80 border-slate-700/60 text-amber-300/90'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <span>{t(currentStep.hintKey, language)}</span>
                </div>

                {/* Результат валидации шага */}
                {stepValidationMessage && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-medium border ${
                      stepValidationMessage.includes('Отлично') ||
                      stepValidationMessage.includes('Офарин')
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : isLight
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-amber-950/60 border-amber-800 text-amber-300'
                    }`}
                  >
                    {stepValidationMessage}
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={checkLessonStep}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                      isLight
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 shadow-2xs'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`}
                    />
                    <span>{t('lesson.btn.check', language)}</span>
                  </button>

                  {activeStepIndex < (activeLesson?.steps.length || 1) - 1 && (
                    <button
                      onClick={nextLessonStep}
                      className="py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1 shadow-sm active:scale-95"
                    >
                      <span>{t('lesson.btn.next', language)}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
