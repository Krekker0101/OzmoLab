/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Правая панель: Журнал наблюдений, Осциллограф, Теория, Задания и ИИ-наставник
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle,
  HelpCircle,
  Send,
  Sparkles,
  User,
  XCircle,
  Lightbulb,
  CheckCircle2,
  X,
  MessageSquare,
  ChevronRight,
  Download,
  FileText,
  Calculator,
  ListTodo,
  Gauge,
  Sliders,
  ArrowRightLeft,
  Scale,
  Zap,
} from 'lucide-react';
import {useLabStore, JournalTab} from '../store/useLabStore.ts';
import {t} from '../../../shared/i18n.ts';
import {PedagogyMode} from '../../../shared/types.ts';
import {
  PhysicalQuantity,
  UNIT_SCALES,
  QUANTITY_BASE_UNITS,
} from '../store/unitConversionUtility.ts';
import {
  generateTelemetryCSV,
  generateOscilloscopeCSV,
  downloadCsvFile,
} from '../utils/telemetryCsvExport.ts';

export const ObservationJournal: React.FC = () => {
  const {
    language,
    theme,
    activeLab,
    simulationResult,
    circuitPhysics,
    unitSystemMode,
    setUnitSystemMode,
    autoConvertUnit,
    convertUnit,
    components,
    wires,
    activeJournalTab,
    setActiveJournalTab,
    oscilloscopeData,
    activeLessonId,
    activeStepIndex,
    stepValidationMessage,
    checkLessonStep,
    nextLessonStep,
    tutorMessages,
    isTutorLoading,
    isTutorOpen,
    setTutorOpen,
    pedagogyMode,
    setPedagogyMode,
    sendTutorMessage,
    requestTutorHint,
    checkMyCircuit,
    applySynthesizedCircuit,
  } = useLabStore();

  const [inputMessage, setInputMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  // Состояние интерактивного конвертера единиц телеметрии
  const [selectedConvertQuantity, setSelectedConvertQuantity] =
    useState<PhysicalQuantity>('resistance');
  const [selectedTargetUnit, setSelectedTargetUnit] = useState<string | null>(null);
  const [isConverterOpen, setIsConverterOpen] = useState(true);

  // State for biology organelle observation checklist
  const [observedOrganelles, setObservedOrganelles] = useState<Record<string, boolean>>({
    cell_wall: true,
    nucleus: true,
    cytoplasm: true,
    vacuole: true,
    chloroplasts: false,
  });

  const toggleOrganelle = (key: string) => {
    setObservedOrganelles((prev) => ({...prev, [key]: !prev[key]}));
  };

  useEffect(() => {
    if (isTutorOpen) {
      chatEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }
  }, [tutorMessages, isTutorLoading, isTutorOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTutorLoading) return;
    const text = inputMessage.trim();
    setInputMessage('');
    await sendTutorMessage(text);
  };

  // Экспорт телеметрии в CSV для лабораторного анализа
  const handleExportCSV = () => {
    const isClosedCircuit = Boolean(simulationResult?.isClosedCircuit);
    const isShortCircuit = Boolean(simulationResult?.hasShortCircuit);
    const statusStr = isShortCircuit ? 'short_circuit' : isClosedCircuit ? 'closed_circuit' : 'open_circuit';

    const baseCurrent = circuitPhysics?.totalCurrent ?? (simulationResult?.totalCurrent || 0);
    const baseResistance =
      circuitPhysics?.equivalentResistance ?? (simulationResult?.totalEquivalentResistance || 0);
    const baseVoltage = circuitPhysics?.totalVoltage ?? 9.0;
    const basePower = circuitPhysics?.totalPower ?? baseVoltage * baseCurrent;

    const exportComponents = components.map((c) => {
      const compPhys = circuitPhysics?.components[c.id];
      const st = simulationResult?.componentStates[c.id];

      const compR = compPhys?.resistance ?? (c.values.resistance ?? 10);
      const compU = compPhys?.voltageDrop ?? (st?.voltageDrop ?? 0);
      const compI = compPhys?.current ?? (st?.current ?? 0);
      const compP = compPhys?.power ?? compU * compI;

      const convertedR = autoConvertUnit(compR, 'resistance', {mode: unitSystemMode});
      const convertedU = autoConvertUnit(compU, 'voltage', {mode: unitSystemMode});
      const convertedI = autoConvertUnit(compI, 'current', {mode: unitSystemMode});
      const convertedP = autoConvertUnit(compP, 'power', {mode: unitSystemMode});

      return {
        id: c.id,
        type: c.type,
        name: t(`component.${c.type}`, language),
        isConducting: Boolean(compPhys?.isConducting),
        resistance: compR,
        resistanceFormatted: convertedR.formatted,
        voltageDrop: compU,
        voltageFormatted: convertedU.formatted,
        current: compI,
        currentFormatted: convertedI.formatted,
        power: compP,
        powerFormatted: convertedP.formatted,
        nominalValues: c.values,
      };
    });

    const csvContent = generateTelemetryCSV({
      labId: activeLab.id,
      labTitle: t(activeLab.titleKey, language),
      discipline,
      status: statusStr,
      totalVoltage: baseVoltage,
      totalCurrent: baseCurrent,
      equivalentResistance: baseResistance,
      totalPower: basePower,
      unitSystemMode,
      components: exportComponents,
      oscilloscopeData: oscilloscopeData.length > 0 ? oscilloscopeData : undefined,
      opticsData:
        discipline === 'optics'
          ? {
              focalLengthCm,
              opticalPowerD,
              wavelengthNm,
              objectDistanceD,
              imageDistanceF,
              magnificationGamma,
              hasOpticBeam,
            }
          : undefined,
      biologyData:
        discipline === 'biology'
          ? {
              totalMagnification,
              fieldOfViewUm,
              resolutionUm,
              isSampleMounted,
              observedOrganelles,
            }
          : undefined,
    });

    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadCsvFile(csvContent, `ozmo-lab-telemetry-${activeLab.id}-${dateStr}.csv`);
  };

  // Экспорт данных осциллографа в CSV
  const handleExportOscilloscopeCSV = () => {
    const csvContent = generateOscilloscopeCSV(oscilloscopeData, {
      labId: activeLab.id,
      totalCurrent: simulationResult?.totalCurrent || 0,
    });
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadCsvFile(csvContent, `ozmo-lab-oscilloscope-${activeLab.id}-${dateStr}.csv`);
  };

  // Экспорт состояния схемы в JSON
  const handleExportJSON = () => {
    const data = {
      labId: activeLab.id,
      timestamp: new Date().toISOString(),
      components,
      wires,
      simulationResult,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ozmo-lab-${activeLab.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Экспорт отчета об эксперименте
  const handleExportReport = () => {
    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Озмо Лаб — Лабораторный отчет</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #1e293b; }
          h1 { color: #0284c7; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #f8fafc; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Озмо Лаб (Ozmo Lab) — Отчет о лабораторной работе</h1>
        <p><strong>Лаборатория:</strong> ${t(activeLab.titleKey, language)}</p>
        <p><strong>Дата и время:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Статус:</strong> <span class="badge">${simulationResult?.isClosedCircuit ? 'Цепь замкнута' : 'Цепь разомкнута'}</span></p>
        <h3>Параметры эксперимента</h3>
        <p>Общий ток I: <strong>${(simulationResult?.totalCurrent || 0).toFixed(2)} A</strong></p>
        <p>Эквивалентное сопротивление R: <strong>${(simulationResult?.totalEquivalentResistance || 0).toFixed(1)} Ω</strong></p>
        <h3>Список компонентов (${components.length})</h3>
        <table>
          <tr><th>Тип</th><th>ID</th><th>Параметры</th></tr>
          ${components.map((c) => `<tr><td>${c.type}</td><td>${c.id}</td><td>${JSON.stringify(c.values)}</td></tr>`).join('')}
        </table>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const discipline = activeLab.discipline || 'circuits';
  const isClosed = Boolean(simulationResult?.isClosedCircuit);
  const isShort = Boolean(simulationResult?.hasShortCircuit);

  // Расчеты оптики
  const laserComp = components.find((c) => c.type === 'laser_source');
  const lensComp = components.find((c) => c.type === 'convex_lens');
  const screenComp = components.find((c) => c.type === 'optical_screen');

  const focalLengthCm = lensComp?.values?.focalLength ?? 15;
  const opticalPowerD = Number((100 / focalLengthCm).toFixed(1));
  const wavelengthNm = laserComp?.values?.wavelength ?? 650;
  const hasOpticBeam = Boolean(laserComp && lensComp && screenComp);

  const objectDistanceD = lensComp && laserComp ? Math.max(10, Math.round(Math.abs(lensComp.x - laserComp.x) / 10)) : 24;
  const invF = 1 / focalLengthCm;
  const invD = 1 / objectDistanceD;
  const invImage = invF - invD;
  const imageDistanceF = invImage > 0.001 ? Math.round(1 / invImage) : 30;
  const magnificationGamma = Number((imageDistanceF / objectDistanceD).toFixed(2));

  // Расчеты биологии
  const microComp = components.find((c) => c.type === 'microscope');
  const slideComp = components.find((c) => c.type === 'slide_sample');
  const totalMagnification = microComp?.values?.magnification ?? 400;
  const fieldOfViewUm = Math.round(180000 / totalMagnification);
  const resolutionUm = Number((0.61 * 0.55 / (totalMagnification > 400 ? 1.25 : 0.65)).toFixed(2));
  const isSampleMounted = Boolean(slideComp);

  const activeLesson = activeLab.lessons.find((l) => l.id === activeLessonId);
  const activeStep = activeLesson?.steps[activeStepIndex];

  return (
    <>
      {/* Правая панель с вкладками */}
      <aside
        className={`w-88 flex flex-col shrink-0 transition-colors duration-200 border-l ${
          isLight
            ? 'bg-white border-slate-200/90 text-slate-800'
            : 'bg-slate-900/95 border-slate-800 text-slate-200'
        }`}
      >
        {/* Шапка с вкладками журнала */}
        <div
          className={`border-b flex items-center justify-between px-2 pt-2 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/40 border-slate-800'
          }`}
        >
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveJournalTab('observations')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                activeJournalTab === 'observations'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>{t('journal.tab.observations', language)}</span>
            </button>

            <button
              onClick={() => setActiveJournalTab('oscilloscope')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                activeJournalTab === 'oscilloscope'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{t('journal.tab.oscilloscope', language)}</span>
            </button>

            <button
              onClick={() => setActiveJournalTab('theory')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                activeJournalTab === 'theory'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{t('journal.tab.theory', language)}</span>
            </button>

            <button
              onClick={() => setActiveJournalTab('tasks')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                activeJournalTab === 'tasks'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>{t('journal.tab.tasks', language)}</span>
            </button>
          </div>

          {/* Быстрые действия экспорта */}
          <div className="flex items-center gap-1 pb-1">
            <button
              onClick={handleExportCSV}
              className="px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700/80 cursor-pointer"
              title={t('journal.export.csv', language)}
              aria-label="Download CSV"
            >
              <Download className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title={t('journal.export.json', language)}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportReport}
              className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title={t('journal.export.report', language)}
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ТЕЛО ВКЛАДОК */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ВКЛАДКА 1: НАБЛЮДЕНИЯ */}
          {activeJournalTab === 'observations' && (
            <div className="space-y-4">
              {/* Карточка быстрого скачивания CSV с телеметрией */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                  isLight
                    ? 'bg-gradient-to-r from-sky-50/80 via-white to-slate-50 border-sky-200/90 shadow-2xs'
                    : 'bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border-sky-800/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {t('journal.btn.download_telemetry_csv', language)}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {t('journal.csv.description', language)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white shadow-xs transition-all shrink-0 cursor-pointer"
                  title={t('journal.export.csv', language)}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('journal.btn.download_csv', language)}</span>
                </button>
              </div>

              {/* Баннер ИИ-Создателя схем */}
              {discipline === 'circuits' && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isLight
                      ? 'bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-white border-indigo-200/90 shadow-2xs'
                      : 'bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border-indigo-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{language === 'tg' ? 'ИИ-Созандаи схемаҳо' : language === 'ru' ? 'ИИ-Создатель схем' : 'AI Circuit Builder'}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                          Meta AI
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {language === 'tg'
                          ? 'Тарҳрезии худкор ва гузоштани схема ба 2D ва 3D'
                          : 'Синтез схем по описанию и выкладка в 2D и 3D'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setTutorOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all shrink-0 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>{language === 'tg' ? 'Сохтани схема' : language === 'ru' ? 'Создать' : 'Create'}</span>
                  </button>
                </div>
              )}

              {/* Статус цепи / системы */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700'
                }`}
              >
                <span className="text-xs font-semibold">Статус:</span>
                {isShort ? (
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{t('journal.status.short', language)}</span>
                  </span>
                ) : isClosed ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{t('journal.status.closed', language)}</span>
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{t('journal.status.open', language)}</span>
                  </span>
                )}
              </div>

              {/* Метрики Электрических цепей с контекстной конвертацией единиц */}
              {discipline === 'circuits' && (() => {
                const baseCurrent = circuitPhysics?.totalCurrent ?? (simulationResult?.totalCurrent || 0);
                const baseResistance =
                  circuitPhysics?.equivalentResistance ?? (simulationResult?.totalEquivalentResistance || 0);
                const baseVoltage = circuitPhysics?.totalVoltage ?? 9.0;
                const basePower = circuitPhysics?.totalPower ?? baseVoltage * baseCurrent;

                const convertedCurrent = autoConvertUnit(baseCurrent, 'current', {mode: unitSystemMode});
                const convertedResistance = autoConvertUnit(baseResistance, 'resistance', {
                  mode: unitSystemMode,
                });
                const convertedVoltage = autoConvertUnit(baseVoltage, 'voltage', {mode: unitSystemMode});
                const convertedPower = autoConvertUnit(basePower, 'power', {mode: unitSystemMode});

                const activeConverterValue =
                  selectedConvertQuantity === 'resistance'
                    ? baseResistance
                    : selectedConvertQuantity === 'current'
                      ? baseCurrent
                      : selectedConvertQuantity === 'voltage'
                        ? baseVoltage
                        : basePower;
                const activeBaseUnit = QUANTITY_BASE_UNITS[selectedConvertQuantity];
                const availableScales = UNIT_SCALES[selectedConvertQuantity];
                const optimalScale =
                  availableScales.find(
                    (s) => s.symbol === autoConvertUnit(activeConverterValue, selectedConvertQuantity).targetUnit
                  ) || availableScales[1];
                const currentTargetScale = selectedTargetUnit
                  ? availableScales.find((s) => s.symbol === selectedTargetUnit) || optimalScale
                  : optimalScale;
                const convertedInspectorValue = convertUnit(
                  activeConverterValue,
                  activeBaseUnit,
                  currentTargetScale.symbol,
                  selectedConvertQuantity
                );

                return (
                  <div className="space-y-3">
                    {/* Переключатель режима системы единиц (Auto / SI Base / Engineering) */}
                    <div
                      className={`p-1.5 rounded-xl border flex items-center justify-between gap-1 text-[11px] ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 px-1.5 text-slate-500 font-semibold">
                        <Scale className="w-3.5 h-3.5 text-sky-500" />
                        <span className="hidden sm:inline">{t('unit.converter.title', language)}:</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {(['auto', 'si-base', 'engineering'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setUnitSystemMode(mode)}
                            className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                              unitSystemMode === mode
                                ? isLight
                                  ? 'bg-white text-sky-700 shadow-2xs font-bold border border-slate-200'
                                  : 'bg-slate-700 text-sky-300 shadow-2xs font-bold border border-slate-600'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            {mode === 'auto'
                              ? t('unit.mode.auto', language)
                              : mode === 'si-base'
                                ? t('unit.mode.base', language)
                                : t('unit.mode.eng', language)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Сетка основных показателей телеметрии с контекстной конвертацией */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Сила тока (I) */}
                      <div
                        className={`p-3 rounded-xl border transition-all ${
                          isLight ? 'bg-sky-50/60 border-sky-100' : 'bg-sky-950/30 border-sky-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400">
                            {t('journal.total_current', language)} (I)
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono font-semibold">
                            {convertedCurrent.targetUnit}
                          </span>
                        </div>
                        <div className="text-xl font-bold font-mono text-sky-700 dark:text-sky-300">
                          {convertedCurrent.formatted}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center justify-between">
                          <span>= {convertedCurrent.baseFormatted}</span>
                          <span className="opacity-75">{convertedCurrent.scientificFormatted.split(' ')[0]}</span>
                        </div>
                      </div>

                      {/* Эквивалентное сопротивление (R) */}
                      <div
                        className={`p-3 rounded-xl border transition-all ${
                          isLight ? 'bg-amber-50/60 border-amber-100' : 'bg-amber-950/30 border-amber-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                            {t('journal.equivalent_r', language)} (R)
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-semibold">
                            {convertedResistance.targetUnit}
                          </span>
                        </div>
                        <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-300">
                          {convertedResistance.formatted}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center justify-between">
                          <span>= {convertedResistance.baseFormatted}</span>
                          <span className="opacity-75">{convertedResistance.scientificFormatted.split(' ')[0]}</span>
                        </div>
                      </div>

                      {/* Полное напряжение (U) */}
                      <div
                        className={`p-3 rounded-xl border transition-all ${
                          isLight ? 'bg-indigo-50/60 border-indigo-100' : 'bg-indigo-950/30 border-indigo-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                            {t('physics.output.voltage', language)} (U)
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                            {convertedVoltage.targetUnit}
                          </span>
                        </div>
                        <div className="text-xl font-bold font-mono text-indigo-700 dark:text-indigo-300">
                          {convertedVoltage.formatted}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          = {convertedVoltage.baseFormatted}
                        </div>
                      </div>

                      {/* Электрическая мощность (P) */}
                      <div
                        className={`p-3 rounded-xl border transition-all ${
                          isLight ? 'bg-purple-50/60 border-purple-100' : 'bg-purple-950/30 border-purple-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">
                            {t('physics.output.power', language)} (P)
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-semibold">
                            {convertedPower.targetUnit}
                          </span>
                        </div>
                        <div className="text-xl font-bold font-mono text-purple-700 dark:text-purple-300">
                          {convertedPower.formatted}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          = {convertedPower.baseFormatted}
                        </div>
                      </div>
                    </div>

                    {/* Интерактивный конвертер единиц телеметрии */}
                    <div
                      className={`p-3 rounded-xl border transition-all ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-800/80 border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-sky-500" />
                          <span>{t('unit.converter.title', language)}</span>
                        </div>
                        <button
                          onClick={() => setIsConverterOpen(!isConverterOpen)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium"
                        >
                          {isConverterOpen ? 'Скрыть' : 'Показать'}
                        </button>
                      </div>

                      {isConverterOpen && (
                        <div className="space-y-2.5">
                          {/* Выбор физической величины */}
                          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
                            {(['resistance', 'current', 'voltage', 'power'] as PhysicalQuantity[]).map((qty) => (
                              <button
                                key={qty}
                                onClick={() => {
                                  setSelectedConvertQuantity(qty);
                                  setSelectedTargetUnit(null);
                                }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${
                                  selectedConvertQuantity === qty
                                    ? 'bg-sky-600 text-white shadow-2xs'
                                    : isLight
                                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {qty === 'resistance' && 'Сопротивление (Ω)'}
                                {qty === 'current' && 'Ток (A)'}
                                {qty === 'voltage' && 'Напряжение (V)'}
                                {qty === 'power' && 'Мощность (W)'}
                              </button>
                            ))}
                          </div>

                          {/* Чипы доступных кратных и дольных единиц */}
                          <div className="grid grid-cols-4 gap-1.5">
                            {availableScales.map((scale) => {
                              const valInScale = convertUnit(
                                activeConverterValue,
                                activeBaseUnit,
                                scale.symbol,
                                selectedConvertQuantity
                              );
                              const isSelected = currentTargetScale.symbol === scale.symbol;

                              return (
                                <button
                                  key={scale.symbol}
                                  onClick={() => setSelectedTargetUnit(scale.symbol)}
                                  className={`p-1.5 rounded-lg border text-center transition-all ${
                                    isSelected
                                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500'
                                      : isLight
                                        ? 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        : 'border-slate-700 hover:bg-slate-700/50 text-slate-300'
                                  }`}
                                >
                                  <div className="text-[11px] font-bold font-mono">
                                    {Math.abs(valInScale) >= 1000
                                      ? valInScale.toFixed(1)
                                      : Math.abs(valInScale) < 0.01 && valInScale !== 0
                                        ? valInScale.toExponential(1)
                                        : valInScale.toFixed(2)}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-semibold">{scale.symbol}</div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Формула пересчета и пояснение для ученика */}
                          <div
                            className={`p-2 rounded-lg text-[10px] font-mono flex flex-col gap-0.5 ${
                              isLight ? 'bg-slate-50 text-slate-600' : 'bg-slate-900/60 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-sky-600 dark:text-sky-400">
                              <span>
                                {activeConverterValue.toFixed(2)} {activeBaseUnit} ={' '}
                                {convertedInspectorValue.toFixed(
                                  currentTargetScale.factor >= 1e6 || currentTargetScale.factor <= 1e-6 ? 4 : 2
                                )}{' '}
                                {currentTargetScale.symbol}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 font-sans">
                                {currentTargetScale.multiplierText}
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-400 font-sans">
                              {currentTargetScale.factor === 1
                                ? `1 ${activeBaseUnit} — основная единица Международной системы СИ`
                                : currentTargetScale.factor > 1
                                  ? `1 ${currentTargetScale.symbol} = ${currentTargetScale.factor.toLocaleString()} ${activeBaseUnit} (умножение на ${currentTargetScale.factor})`
                                  : `1 ${currentTargetScale.symbol} = ${currentTargetScale.factor} ${activeBaseUnit} (деление на ${Math.round(1 / currentTargetScale.factor).toLocaleString()})`}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Таблица компонентов с контекстной конвертацией */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span>Элементы в цепи ({components.length})</span>
                          <button
                            onClick={handleExportCSV}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 flex items-center gap-1 transition-colors cursor-pointer"
                            title={t('journal.export.csv', language)}
                          >
                            <Download className="w-2.5 h-2.5" />
                            <span>CSV</span>
                          </button>
                        </div>
                        <span className="text-[9px] font-mono lowercase opacity-75">
                          масштабирование: {unitSystemMode}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {components.map((c) => {
                          const compPhys = circuitPhysics?.components[c.id];
                          const st = simulationResult?.componentStates[c.id];

                          const compR = compPhys?.resistance ?? (c.values.resistance ?? 10);
                          const compU = compPhys?.voltageDrop ?? (st?.voltageDrop ?? 0);
                          const compI = compPhys?.current ?? (st?.current ?? 0);

                          const convertedR = autoConvertUnit(compR, 'resistance', {mode: unitSystemMode});
                          const convertedU = autoConvertUnit(compU, 'voltage', {mode: unitSystemMode});
                          const convertedI = autoConvertUnit(compI, 'current', {mode: unitSystemMode});

                          return (
                            <div
                              key={c.id}
                              className={`p-2 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                                compPhys?.isConducting
                                  ? isLight
                                    ? 'bg-emerald-50/40 border-emerald-200'
                                    : 'bg-emerald-950/20 border-emerald-800/40'
                                  : isLight
                                    ? 'bg-white border-slate-200'
                                    : 'bg-slate-800 border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                  {t(`component.${c.type}`, language)}
                                </span>
                                {compPhys?.isConducting && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    ток
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                                {/* Сопротивление */}
                                {c.type !== 'battery' && (
                                  <span title={`Базовое: ${convertedR.baseFormatted}`}>
                                    R: <strong className="text-slate-700 dark:text-slate-200">{convertedR.formatted}</strong>
                                    {convertedR.targetUnit !== 'Ω' && (
                                      <span className="text-[9px] text-slate-400 ml-0.5">({convertedR.baseFormatted})</span>
                                    )}
                                  </span>
                                )}

                                {/* Напряжение */}
                                <span>
                                  U: <strong className="text-indigo-600 dark:text-indigo-400">{convertedU.formatted}</strong>
                                </span>

                                {/* Сила тока */}
                                {compI > 0.0001 && (
                                  <span>
                                    I: <strong className="text-sky-600 dark:text-sky-400">{convertedI.formatted}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Метрики Оптики */}
              {discipline === 'optics' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div
                      className={`p-3 rounded-xl border ${
                        isLight ? 'bg-cyan-50/60 border-cyan-100' : 'bg-cyan-950/30 border-cyan-900/40'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400 block mb-1">
                        {t('journal.optics.focal_power', language)}
                      </span>
                      <div className="text-xl font-bold font-mono text-cyan-700 dark:text-cyan-300">
                        {opticalPowerD > 0 ? `+${opticalPowerD}` : opticalPowerD}{' '}
                        <span className="text-xs font-sans">dpt</span>
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-xl border ${
                        isLight ? 'bg-amber-50/60 border-amber-100' : 'bg-amber-950/30 border-amber-900/40'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block mb-1">
                        {t('journal.optics.magnification', language)}
                      </span>
                      <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-300">
                        {magnificationGamma}×
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border space-y-1.5 text-xs bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Масофаи ҷисм (d):</span>
                      <span className="font-mono font-bold">{objectDistanceD} cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Масофаи тасвир (f):</span>
                      <span className="font-mono font-bold">{imageDistanceF} cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Хусусияти тасвир:</span>
                      <span className="text-emerald-600 font-bold">{t('journal.optics.real_inverted', language)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Метрики Биологии */}
              {discipline === 'biology' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div
                      className={`p-3 rounded-xl border ${
                        isLight ? 'bg-emerald-50/60 border-emerald-100' : 'bg-emerald-950/30 border-emerald-900/40'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                        {t('journal.bio.total_mag', language)}
                      </span>
                      <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                        {totalMagnification}×
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-xl border ${
                        isLight ? 'bg-teal-50/60 border-teal-100' : 'bg-teal-950/30 border-teal-900/40'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 block mb-1">
                        {t('journal.bio.fov', language)}
                      </span>
                      <div className="text-xl font-bold font-mono text-teal-700 dark:text-teal-300">
                        {fieldOfViewUm} <span className="text-xs font-sans">µm</span>
                      </div>
                    </div>
                  </div>

                  {/* Чек-лист органелл */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {t('journal.bio.structures', language)}
                    </span>
                    <div className="space-y-1.5">
                      {[
                        {key: 'cell_wall', name: t('journal.bio.cell_wall', language)},
                        {key: 'nucleus', name: t('journal.bio.nucleus', language)},
                        {key: 'cytoplasm', name: t('journal.bio.cytoplasm', language)},
                        {key: 'vacuole', name: t('journal.bio.vacuole', language)},
                        {key: 'chloroplasts', name: t('journal.bio.chloroplasts', language)},
                      ].map((item) => (
                        <label
                          key={item.key}
                          onClick={() => toggleOrganelle(item.key)}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            observedOrganelles[item.key]
                              ? isLight
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                              : isLight
                                ? 'bg-white border-slate-200 text-slate-500'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          <span>{item.name}</span>
                          <input
                            type="checkbox"
                            checked={Boolean(observedOrganelles[item.key])}
                            onChange={() => {}}
                            className="rounded accent-emerald-600"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ВКЛАДКА 2: ОСЦИЛЛОГРАФ И ГРАФИКИ */}
          {activeJournalTab === 'oscilloscope' && (
            <div className="space-y-4">
              <div
                className={`p-3 rounded-2xl border ${
                  isLight ? 'bg-slate-900 text-emerald-400 border-slate-800' : 'bg-slate-950 text-emerald-400 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-500">
                    Осциллограф I(t) / U(t)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600">CH1: 2.0A/div</span>
                </div>

                {/* SVG сетка и кривая сигнала */}
                <div className="relative w-full h-40 bg-slate-950 rounded-xl overflow-hidden border border-emerald-950 flex items-center justify-center">
                  <svg width="100%" height="100%" viewBox="0 0 280 140" className="overflow-visible">
                    {/* Координатная сетка осциллографа */}
                    {Array.from({length: 8}).map((_, i) => (
                      <line
                        key={`v_${i}`}
                        x1={i * 35}
                        y1="0"
                        x2={i * 35}
                        y2="140"
                        stroke="#064e3b"
                        strokeWidth="0.8"
                        strokeDasharray="2 2"
                      />
                    ))}
                    {Array.from({length: 5}).map((_, i) => (
                      <line
                        key={`h_${i}`}
                        x1="0"
                        y1={i * 28}
                        x2="280"
                        y2={i * 28}
                        stroke="#064e3b"
                        strokeWidth="0.8"
                        strokeDasharray="2 2"
                      />
                    ))}
                    <line x1="0" y1="70" x2="280" y2="70" stroke="#047857" strokeWidth="1" />

                    {/* График тока */}
                    {oscilloscopeData.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        points={oscilloscopeData
                          .map((d, idx) => {
                            const x = (idx / (oscilloscopeData.length - 1)) * 280;
                            const y = 120 - Math.min(100, d.current * 40);
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                    )}
                  </svg>
                </div>

                <div className="mt-2.5 flex justify-between text-[10px] font-mono text-emerald-500">
                  <span>I_peak: {(simulationResult?.totalCurrent || 0).toFixed(2)}A</span>
                  <span>f: 50.0 Hz</span>
                  <span>V_rms: 9.0V</span>
                </div>

                {/* Скачивание точек осциллографа в CSV */}
                <div className="mt-3 pt-2 border-t border-emerald-950/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-600">
                    {oscilloscopeData.length} точек в буфере
                  </span>
                  <button
                    onClick={handleExportOscilloscopeCSV}
                    className="px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/60 transition-colors cursor-pointer"
                    title={t('journal.btn.download_oscilloscope_csv', language)}
                  >
                    <Download className="w-3 h-3" />
                    <span>{t('journal.btn.download_oscilloscope_csv', language)}</span>
                  </button>
                </div>
              </div>

              {/* Теоретический расчет графика */}
              <div className="p-3 rounded-xl border text-xs space-y-1 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
                <span className="font-bold block text-slate-700 dark:text-slate-300">
                  Анализ формы сигнала:
                </span>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  Постоянный ток с высокочастотной пульсацией от активного источника питания. Пунктирная сетка калибрована 0.05с/деление.
                </p>
              </div>
            </div>
          )}

          {/* ВКЛАДКА 3: ТЕОРИЯ И ФОРМУЛЫ */}
          {activeJournalTab === 'theory' && (
            <div className="space-y-4">
              {discipline === 'circuits' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900">
                    <h4 className="text-xs font-bold text-sky-800 dark:text-sky-300 mb-1">
                      Закон Ома для участка цепи
                    </h4>
                    <div className="font-mono text-sm font-bold text-sky-900 dark:text-sky-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-sky-200 dark:border-sky-800 my-2 text-center">
                      I = U / R = 9.0 V / {(simulationResult?.totalEquivalentResistance || 10).toFixed(1)} Ω = {(simulationResult?.totalCurrent || 0).toFixed(2)} A
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Сила тока в проводнике прямо пропорциональна напряжению и обратно пропорциональна сопротивлению проводника.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                    <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                      Закон Джоуля-Ленца (Мощность)
                    </h4>
                    <div className="font-mono text-sm font-bold text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-amber-200 dark:border-amber-800 my-2 text-center">
                      P = I² · R = {Math.pow(simulationResult?.totalCurrent || 0, 2).toFixed(2)} · {(simulationResult?.totalEquivalentResistance || 0).toFixed(1)} = {(Math.pow(simulationResult?.totalCurrent || 0, 2) * (simulationResult?.totalEquivalentResistance || 0)).toFixed(2)} W
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Количество теплоты, выделяемое в проводнике при прохождении тока.
                    </p>
                  </div>
                </div>
              )}

              {discipline === 'optics' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-900">
                    <h4 className="text-xs font-bold text-cyan-800 dark:text-cyan-300 mb-1">
                      Формула тонкой линзы
                    </h4>
                    <div className="font-mono text-sm font-bold text-cyan-900 dark:text-cyan-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-cyan-200 dark:border-cyan-800 my-2 text-center">
                      1/F = 1/d + 1/f = D
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Связывает фокусное расстояние линзы (F) с расстоянием до предмета (d) и расстоянием до изображения (f).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
                    <h4 className="text-xs font-bold text-purple-800 dark:text-purple-300 mb-1">
                      Закон Снеллиуса (Преломление)
                    </h4>
                    <div className="font-mono text-sm font-bold text-purple-900 dark:text-purple-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-purple-200 dark:border-purple-800 my-2 text-center">
                      n₁ · sin(α) = n₂ · sin(β)
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Определяет угол преломления света на границе двух оптически прозрачных сред.
                    </p>
                  </div>
                </div>
              )}

              {discipline === 'biology' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
                    <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                      Общее увеличение микроскопа
                    </h4>
                    <div className="font-mono text-sm font-bold text-emerald-900 dark:text-emerald-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 my-2 text-center">
                      M = M_объектив × M_окуляр = {totalMagnification / 10} × 10 = {totalMagnification}×
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Произведение увеличения объектива револьвера на увеличение окуляра (стандартно 10×).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900">
                    <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 mb-1">
                      Критерий Рэлея (Предел разрешения)
                    </h4>
                    <div className="font-mono text-sm font-bold text-teal-900 dark:text-teal-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-teal-200 dark:border-teal-800 my-2 text-center">
                      d = 0.61 · λ / NA ≈ {resolutionUm} µm
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Минимальное расстояние между двумя точками, при котором они ещё видны раздельно в микроскоп.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ВКЛАДКА 4: ЗАДАНИЯ И ПРАКТИКУМ */}
          {activeJournalTab === 'tasks' && (
            <div className="space-y-4">
              {activeLesson && activeStep ? (
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                        {t(activeLesson.titleKey, language)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        Шаг {activeStep.stepNumber} из {activeLesson.steps.length}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {t(activeStep.titleKey, language)}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t(activeStep.instructionKey, language)}
                    </p>

                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                      <span>{t(activeStep.hintKey, language)}</span>
                    </div>

                    {stepValidationMessage && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{stepValidationMessage}</span>
                      </div>
                    )}

                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={checkLessonStep}
                        className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95"
                      >
                        Проверить выполнение
                      </button>

                      {activeStepIndex < activeLesson.steps.length - 1 && (
                        <button
                          onClick={nextLessonStep}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1 active:scale-95"
                        >
                          <span>Дальше</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  Нет активного задания.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Плавающая кнопка вызова ИИ-наставника */}
        <div
          className={`p-3 border-t shrink-0 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/40 border-slate-800'
          }`}
        >
          <button
            onClick={() => setTutorOpen(true)}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Bot className="w-4 h-4" />
            <span>{t('tutor.title', language)}</span>
          </button>
        </div>
      </aside>

      {/* МОДАЛЬНЫЙ ДИАЛОГ С ИИ-НАСТАВНИКОМ */}
      {isTutorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            className={`relative w-full max-w-lg h-[620px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
              isLight
                ? 'bg-white text-slate-800 border-slate-200'
                : 'bg-slate-900/98 text-slate-100 border-slate-800 backdrop-blur-md'
            }`}
          >
            {/* Шапка чата */}
            <div
              className={`p-3.5 border-b flex items-center justify-between ${
                isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isLight ? 'bg-sky-600 text-white' : 'bg-sky-600/30 text-sky-400'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">
                    {t('tutor.title', language)}
                  </h4>
                  <span className="text-[10px] block text-slate-400">
                    {t('tutor.status_ready', language)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pedagogyMode}
                  onChange={(e) => setPedagogyMode(e.target.value as PedagogyMode)}
                  className={`text-[10px] rounded-md px-1.5 py-1 border outline-none font-medium ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-700'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <option value="combined">{t('tutor.mode.combined', language)}</option>
                  <option value="socratic">{t('tutor.mode.socratic', language)}</option>
                  <option value="direct">{t('tutor.mode.direct', language)}</option>
                </select>

                <button
                  onClick={() => setTutorOpen(false)}
                  className="p-1.5 rounded-lg border hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Сообщения чата */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {tutorMessages.map((msg) => {
                const isTutor = msg.sender === 'tutor' || msg.sender === 'system';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${isTutor ? 'items-start' : 'items-start flex-row-reverse'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        isTutor
                          ? isLight
                            ? 'bg-sky-100 text-sky-700 border border-sky-200'
                            : 'bg-sky-600/30 text-sky-400 border border-sky-500/40'
                          : isLight
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isTutor ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        isTutor
                          ? isLight
                            ? 'bg-slate-100/90 text-slate-800 border border-slate-200/80 shadow-2xs'
                            : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 shadow-sm'
                          : 'bg-sky-600 text-white shadow-sm'
                      }`}
                    >
                      {msg.text || (
                        <span className="flex items-center gap-1.5 text-slate-400 italic py-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce" />
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:0.2s]" />
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:0.4s]" />
                        </span>
                      )}

                      {/* Интерактивная карточка схемы, созданной ИИ */}
                      {msg.synthesizedCircuit && (
                        <div
                          className={`mt-2.5 p-3 rounded-xl border text-left transition-all ${
                            isLight
                              ? 'bg-white border-indigo-200/90 shadow-2xs text-slate-800'
                              : 'bg-slate-900 border-indigo-800/70 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              {msg.synthesizedCircuit.title}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                              ИИ-Создатель
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                            {msg.synthesizedCircuit.description}
                          </p>

                          <div className="text-[10px] font-mono text-slate-400 mb-2.5 flex items-center gap-2">
                            <span>Элементов: {msg.synthesizedCircuit.components.length}</span>
                            <span>•</span>
                            <span>Проводов: {msg.synthesizedCircuit.wires.length}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => applySynthesizedCircuit(msg.synthesizedCircuit!)}
                            className="w-full py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white shadow-xs transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Выложить на верстак (2D & 3D)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isTutorLoading && tutorMessages[tutorMessages.length - 1]?.sender !== 'tutor' && (
                <div className="flex items-center gap-2 text-xs text-sky-500 italic p-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('tutor.thinking', language)}</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Подвал с подсказками и полем ввода */}
            <div
              className={`p-3.5 border-t space-y-2.5 ${
                isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={requestTutorHint}
                  disabled={isTutorLoading}
                  className="py-1.5 px-2 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1.5 bg-amber-50 dark:bg-slate-800 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{t('tutor.btn.hint', language)}</span>
                </button>

                <button
                  type="button"
                  onClick={checkMyCircuit}
                  disabled={isTutorLoading}
                  className="py-1.5 px-2 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{t('tutor.btn.check_circuit', language)}</span>
                </button>
              </div>

              {/* Быстрые команды для ИИ-Создателя схем */}
              {discipline === 'circuits' && (
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{language === 'tg' ? 'ИИ-Созандаи схемаҳо:' : language === 'ru' ? 'ИИ-Создатель схем:' : 'AI Circuit Builder:'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        sendTutorMessage(
                          language === 'tg'
                            ? 'Занҷири оддӣ бо лампа ва калид соз'
                            : 'Собери простую цепь с лампой и ключом'
                        )
                      }
                      disabled={isTutorLoading}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                    >
                      ⚡ {language === 'tg' ? 'Занҷири оддӣ' : language === 'ru' ? 'Простая цепь' : 'Simple circuit'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        sendTutorMessage(
                          language === 'tg'
                            ? 'Пайвасти мувозии ду лампа соз'
                            : 'Собери параллельное соединение двух ламп'
                        )
                      }
                      disabled={isTutorLoading}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
                    >
                      💡 {language === 'tg' ? '2 лампаи мувозӣ' : language === 'ru' ? '2 лампы параллельно' : 'Two lamps in parallel'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        sendTutorMessage(
                          language === 'tg'
                            ? 'Стенди санҷиши қонуни Омро бо амперметр ва волтметр соз'
                            : 'Собери стенд для проверки закона Ома с амперметром и вольтметром'
                        )
                      }
                      disabled={isTutorLoading}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                    >
                      🔬 {language === 'tg' ? 'Қонуни Ом' : language === 'ru' ? 'Стенд: Закон Ома' : "Ohm's law bench"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        sendTutorMessage(
                          language === 'tg'
                            ? 'Тақсимкунандаи шиддат бо резисторҳо соз'
                            : 'Собери делитель напряжения на резисторах'
                        )
                      }
                      disabled={isTutorLoading}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                    >
                      🎛 {language === 'tg' ? 'Тақсимкунанда' : language === 'ru' ? 'Делитель' : 'Voltage divider'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        sendTutorMessage(
                          language === 'tg' ? 'Схема бо реостат ва лампа соз' : language === 'ru' ? 'Собери схему с реостатом и лампой' : 'Build a circuit with a rheostat and lamp'
                        )
                      }
                      disabled={isTutorLoading}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                    >
                      🎚 {language === 'tg' ? 'Реостат' : language === 'ru' ? 'Реостат' : 'Rheostat'}
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={t('tutor.input_placeholder', language)}
                  disabled={isTutorLoading}
                  className="flex-1 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isTutorLoading}
                  className="p-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-sm shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
