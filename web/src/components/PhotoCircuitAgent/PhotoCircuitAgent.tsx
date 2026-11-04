/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Photo-to-Circuit Lab Agent — Interactive UI
 * Meta Global AI Developer Hackathon (Indie Track: "Build for Your World")
 */

import React, {useState, useRef} from 'react';
import {
  Upload,
  Camera,
  Play,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Wrench,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Cpu,
  Layers,
  ShieldCheck,
  RefreshCw,
  Zap,
  X,
} from 'lucide-react';
import {useLabStore} from '../../store/useLabStore.ts';
import {
  AgentRunResult,
  AgentPipelineStep,
  PRESET_CIRCUITS,
} from '../../../../server/circuitAgent.ts';
import {NetlistCircuit, NetlistComponent} from '../../../../shared/schema/netlist.ts';
import {NotebookExtractionResult} from '../../../../shared/schema/notebook.ts';
import {NotebookProblemStudio} from './NotebookProblemStudio.tsx';

function downsampleImage(dataUrl: string, maxDimension = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let {width, height} = img;
      if (width <= maxDimension && height <= maxDimension) {
        resolve(dataUrl);
        return;
      }
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const PhotoCircuitAgent: React.FC = () => {
  const {language, theme, setCurrentView, loadNetlistIntoWorkbench} = useLabStore();
  const isLight = theme === 'light';
  const isTg = language === 'tg';
  const tx = (tg: string, ru: string, en: string) => language === 'en' ? en : language === 'ru' ? ru : tg;

  const [appMode, setAppMode] = useState<'circuit' | 'notebook'>('circuit');
  const [notebookResult, setNotebookResult] = useState<NotebookExtractionResult | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('led_missing_resistor');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPerceiving, setIsPerceiving] = useState<boolean>(false);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [pendingNetlist, setPendingNetlist] = useState<NetlistCircuit | null>(null);
  const [perceptionNotice, setPerceptionNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('before');
  const [agentResult, setAgentResult] = useState<AgentRunResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [perceiveElapsedSec, setPerceiveElapsedSec] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  const handleCancelPerception = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPerceiving(false);
    setPerceiveElapsedSec(0);
    setPerceptionNotice(
      tx('Шинохти акс аз ҷониби корбар бекор карда шуд.', 'Распознавание фото отменено пользователем.', 'Photo recognition was cancelled by the user.'),
    );
  };

  // Run verification pipeline
  const handleRunAgent = async (presetIdToUse?: string, customNetlistToUse?: NetlistCircuit) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload: Record<string, unknown> = {
        language,
      };

      if (customNetlistToUse) {
        payload.customNetlist = customNetlistToUse;
      } else {
        const pId = presetIdToUse !== undefined ? presetIdToUse : selectedPresetId;
        if (pId) {
          payload.presetId = pId;
        }
      }

      const res = await fetch('/api/circuit-agent/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }

      const data: AgentRunResult = await res.json();
      setAgentResult(data);
      setIsReviewing(false);
      if (data.hasMistake) {
        setActiveTab('before');
      }
    } catch (err) {
      console.error('[PhotoCircuitAgent] Run failed:', err);
      setErrorMessage(
        tx('Хатогӣ ҳангоми санҷиши занҷир. Лутфан, дубора кӯшиш кунед.', 'Ошибка при верификации цепи. Пожалуйста, повторите попытку.', 'Circuit verification failed. Please try again.'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Image file upload handler with perception stage and review
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      const base64 = await downsampleImage(rawBase64, 1024);
      setUploadedImage(base64);
      setSelectedPresetId('');
      setErrorMessage(null);
      setPerceptionNotice(null);
      setIsPerceiving(true);
      setPerceiveElapsedSec(0);
      setAgentResult(null);

      // Start elapsed timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setPerceiveElapsedSec((s) => s + 1);
      }, 1000);

      // Setup AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch('/api/notebook/route-and-extract', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({imageBase64: base64, language}),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Routing HTTP error: ${res.status}`);
        }

        const data: NotebookExtractionResult = await res.json();
        setNotebookResult(data);

        if (data.classification.category === 'circuit') {
          setAppMode('circuit');
          if (data.circuitNetlist) {
            setPendingNetlist(data.circuitNetlist);
            setIsReviewing(true);
          } else {
            const cRes = await fetch('/api/circuit-agent/perceive', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({imageBase64: base64, language}),
              signal: controller.signal,
            });
            if (cRes.ok) {
              const cData = await cRes.json();
              setPendingNetlist(cData.netlist);
              setIsReviewing(true);
            }
          }
        } else {
          // supported_problem, other_notes, or not_readable
          setAppMode('notebook');
          setIsReviewing(false);
        }

        if (data.userGuidance) {
          setPerceptionNotice(data.userGuidance);
        }
      } catch (err: unknown) {
        const errorObj = err as Error;
        if (errorObj?.name === 'AbortError') {
          console.log('[PhotoCircuitAgent] Perception aborted by student.');
          return;
        }
        console.error('[PhotoCircuitAgent] Perception failed:', err);
        setErrorMessage(
          tx('Хатогӣ ҳангоми шинохти акс бо модели Meta. Шумо метавонед нақшаро дастӣ созед.', 'Ошибка при распознавании фото моделью Meta. Вы можете собрать цепь вручную.', 'Photo recognition with the Meta model failed. You can build the circuit manually.'),
        );
      } finally {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        abortControllerRef.current = null;
        setIsPerceiving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handlers for confirming & editing detected components
  const updatePendingComponent = (index: number, updates: Partial<NetlistComponent>) => {
    if (!pendingNetlist) return;
    const newComps = [...pendingNetlist.components];
    newComps[index] = {...newComps[index], ...updates};
    setPendingNetlist({...pendingNetlist, components: newComps});
  };

  const removePendingComponent = (index: number) => {
    if (!pendingNetlist) return;
    const newComps = pendingNetlist.components.filter((_, i) => i !== index);
    setPendingNetlist({...pendingNetlist, components: newComps});
  };

  const addPendingComponent = () => {
    if (!pendingNetlist) return;
    const newId = `comp_${Date.now().toString(36).slice(-4)}`;
    setPendingNetlist({
      ...pendingNetlist,
      components: [
        ...pendingNetlist.components,
        {
          id: newId,
          type: 'resistor',
          nodeA: 'n1',
          nodeB: 'n_gnd',
          value: 100,
          label: 'New Component',
          confidence: 1.0,
        },
      ],
    });
  };

  const handleVerifyConfirmedCircuit = (netlistToVerify: NetlistCircuit) => {
    handleRunAgent(undefined, netlistToVerify);
  };

  const currentDisplayNetlist: NetlistCircuit | undefined =
    activeTab === 'after' && agentResult?.proposedFixNetlist
      ? agentResult.proposedFixNetlist
      : agentResult?.originalNetlist || PRESET_CIRCUITS[selectedPresetId]?.netlist;

  const currentDisplaySolution =
    activeTab === 'after' && agentResult?.fixedSolution
      ? agentResult.fixedSolution
      : agentResult?.originalSolution;

  return (
    <div
      className={`flex-1 flex flex-col overflow-y-auto px-4 lg:px-8 py-6 transition-colors duration-200 ${
        isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Banner: Hackathon & Model Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
              Ozmo Lab · Photo-to-Circuit
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Meta Muse Spark Open via Baseten
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Deterministic MNA Solver
            </span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <span className="bg-gradient-to-r from-sky-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
              Photo-to-Circuit Lab Agent
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {tx('Акси занҷири барқиро бор кунед. Агент онро шинохта, ба нетлист табдил медиҳад, бо солвери физикӣ месанҷад, хатогиро мефаҳмонад ва ислоҳи бехатарро синтез менамояд.', 'Сфотографируйте схему или макет цепи. Агент распознает компоненты моделью Meta Muse Spark Open, построит нетлист, верифицирует детерминированным MNA-солвером, диагностирует ошибки и объяснит как учитель физики.', 'Upload a photo of an electrical circuit. The agent recognizes it, builds a netlist, verifies it with a deterministic MNA solver, diagnoses errors, and explains a safe fix like a physics teacher.')}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleRunAgent()}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all ${
              isLoading
                ? 'opacity-60 cursor-not-allowed bg-sky-600 text-white'
                : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white active:scale-95'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{tx('Таҳлил рафта истодааст...', 'Агент анализирует...', 'Agent is analyzing...')}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>{tx('Санҷиши занҷир бо ИИ', 'Верифицировать схему', 'Verify circuit with AI')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mode Switcher: Circuit Agent vs Notebook Photo Mode */}
      <div className="flex items-center gap-2 mt-5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 w-fit border border-slate-300 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setAppMode('circuit')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            appMode === 'circuit'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{tx('1. Занҷирҳои барқӣ (Circuits)', '1. Электрические цепи (Circuits)', '1. Electrical circuits')}</span>
        </button>
        <button
          type="button"
          onClick={() => setAppMode('notebook')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            appMode === 'notebook'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{tx('2. Саҳифаи дафтар (Notebook Mode)', '2. Фото тетради (Notebook Mode)', '2. Notebook page')}</span>
        </button>
      </div>

      {appMode === 'notebook' ? (
        <div className="mt-6">
          <NotebookProblemStudio
            uploadedImage={uploadedImage}
            notebookResult={notebookResult}
            isLight={isLight}
            isTg={isTg}
            language={language}
            onUploadNewPhoto={() => fileInputRef.current?.click()}
            onSwitchToCircuit={() => setAppMode('circuit')}
          />
        </div>
      ) : (
        /* Preset Scenarios & Photo Upload Zone (Circuit Mode) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column: Preset Selector & Photo Dropzone */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
              <span>{tx('1. Акс ё намунаи таҷрибавӣ', '1. Фото схемы или пресет', '1. Circuit photo or preset')}</span>
              {uploadedImage && (
                <button
                  onClick={() => {
                    setUploadedImage(null);
                    setSelectedPresetId('led_missing_resistor');
                    handleRunAgent('led_missing_resistor');
                  }}
                  className="text-sky-600 dark:text-sky-400 hover:underline text-[11px] font-semibold lowercase"
                >
                  {tx('тоза кардан', 'сбросить фото', 'reset photo')}
                </button>
              )}
            </h2>

            {/* Photo Upload Box */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-sky-500 group ${
                uploadedImage
                  ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20'
                  : isLight
                    ? 'border-slate-300 hover:bg-slate-50'
                    : 'border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              {uploadedImage ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative max-h-36 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
                    <img
                      src={uploadedImage}
                      alt="Uploaded circuit"
                      className="max-h-36 object-contain"
                    />
                  </div>
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    {tx('Акс бо муваффақият бор шуд (барои иваз клик кунед)', 'Фото загружено (кликните для замены)', 'Photo uploaded (click to replace)')}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {tx('Акси занҷирро бор кунед', 'Загрузите фото схемы или макета', 'Upload a circuit or layout photo')}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {tx('PNG, JPG аз камера ё галерея', 'PNG, JPG с камеры смартфона или тетради', 'PNG or JPG from a phone camera or notebook')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Educational Preset Cases */}
            <div className="mt-4">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {tx('Намунаҳои омӯзишии мактабӣ:', 'Школьные учебные кейсы:', 'School learning cases:')}
              </div>
              <div className="flex flex-col gap-1.5">
                {[
                  {
                    id: 'led_missing_resistor',
                    name: tx('Диод бе муқовимат (хатари сӯхтан)', 'Светодиод без резистора (перегорит)', 'LED without resistor (burnout risk)'),
                    tag: 'Burnout Hazard',
                    tagColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
                  },
                  {
                    id: 'direct_short_circuit',
                    name: tx('Расиши кӯтоҳ дар батарея (КЗ)', 'Короткое замыкание батареи (КЗ)', 'Battery short circuit'),
                    tag: 'Fire Hazard',
                    tagColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
                  },
                  {
                    id: 'open_switch_loop',
                    name: tx('Занҷири кушода (калиди кушод)', 'Разомкнутая цепь (ключ выключен)', 'Open circuit (switch off)'),
                    tag: 'Open Circuit',
                    tagColor: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  },
                  {
                    id: 'led_reverse_biased',
                    name: tx('Диоди баръакс пайвастшуда', 'Светодиод включен обратной полярностью', 'LED connected with reverse polarity'),
                    tag: 'Reverse Bias',
                    tagColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300',
                  },
                  {
                    id: 'proper_safe_circuit',
                    name: tx('Занҷири дурусти 9В бо 330Ω', 'Штатная безопасная цепь (9В, 330Ω, LED)', 'Safe 9V circuit (330Ω, LED)'),
                    tag: 'Safe OK',
                    tagColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
                  },
                ].map((preset) => {
                  const isSelected = selectedPresetId === preset.id && !uploadedImage;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setUploadedImage(null);
                        handleRunAgent(preset.id);
                      }}
                      className={`text-left p-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? isLight
                            ? 'bg-sky-50 border-sky-400 text-sky-950 shadow-xs'
                            : 'bg-sky-950/40 border-sky-600 text-sky-200'
                          : isLight
                            ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      <span className="truncate">{preset.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${preset.tagColor}`}
                      >
                        {preset.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Error notice if any */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 7-Step Agent Pipeline Timeline */}
          {agentResult && (
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
                <span>{tx('Раванди таҳлили 7-зинагии агент', '7 шагов верификации агента', '7-step agent verification')}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {agentResult.steps.length}/7 {tx('анҷом ёфт', 'завершено', 'completed')}
                </span>
              </h2>

              <div className="flex flex-col gap-2">
                {agentResult.steps.map((st: AgentPipelineStep, idx: number) => {
                  const isWarning = st.status === 'warning';
                  const isSuccess = st.status === 'success';

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                        isWarning
                          ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                          : isSuccess
                            ? isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-800'
                              : 'bg-slate-800/40 border-slate-700 text-slate-200'
                            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isWarning ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        ) : isSuccess ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold flex items-center justify-between gap-1">
                          <span className="truncate">{st.title}</span>
                          <span className="text-[10px] opacity-60">#{idx + 1}</span>
                        </div>
                        <div className="text-[11px] opacity-80 line-clamp-2 mt-0.5">
                          {st.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Visual Circuit Schema, MNA Telemetry & Teacher Explanation */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Perceiving Progress State */}
          {/* Perceiving Progress State with Spinner, Elapsed Timer, and Cancel Button */}
          {isPerceiving && (
            <div
              className={`p-6 sm:p-8 rounded-2xl border text-center flex flex-col items-center justify-center gap-4 transition-all shadow-md ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <RefreshCw className="w-12 h-12 text-sky-500 animate-spin" />
                <span className="absolute text-xs font-mono font-black text-slate-700 dark:text-slate-300">
                  {perceiveElapsedSec}s
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {tx('Таҳлили мултимодалии акс бо Meta Muse Spark Open...', 'Анализ фото схемы моделью Meta Muse Spark Open...', 'Analyzing the photo with Meta Muse Spark Open...')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1">
                  {isTg
                    ? 'Агент гиреҳҳо ва унсурҳоро муайян карда истодааст (одатан 15–25 сония). Шумо метавонед интизор шавед ё амалро бекор кунед.'
                    : tx('Агент гиреҳҳо ва унсурҳоро муайян карда истодааст (одатан 15–25 сония). Шумо метавонед интизор шавед ё амалро бекор кунед.', 'Модель выделяет компоненты и топологические узлы (обычно 15–25 секунд). Вы можете дождаться завершения или отменить операцию.', 'The agent is identifying components and topology nodes (usually 15–25 seconds). You can wait or cancel the operation.')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCancelPerception}
                className="mt-1 px-4 py-2 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>{tx('Бекор кардан', 'Отменить анализ', 'Cancel analysis')}</span>
              </button>
            </div>
          )}

          {/* Confidence & Confirmation Step (Review detected components before solver runs) */}
          {isReviewing && pendingNetlist && !isPerceiving && (
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800 shadow-xl'
              }`}
            >
              {pendingNetlist.isCircuit === false || pendingNetlist.components.length === 0 ? (
                <div className="py-6 px-3 sm:px-4 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="max-w-md">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {isTg
                        ? 'Дар ин акс занҷири барқӣ ёфт нашуд'
                        : tx('Дар ин акс занҷири барқӣ ёфт нашуд', 'На этой фотографии не обнаружена электрическая цепь', 'No electrical circuit was detected in this photo')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {isTg
                        ? 'Агент муайян кард, ки ин расми дигар (масалан, механика, оптика ё қайдҳои дафтар) аст. Мо ҷузъҳои бардурӯғ ихтироъ намекунем. Лутфан, акси нақша ё схемаи барқиро бор кунед.'
                        : tx('Агент муайян кард, ки ин расми дигар (масалан, механика, оптика ё қайдҳои дафтар) аст. Мо ҷузъҳои бардурӯғ ихтироъ намекунем. Лутфан, акси нақша ё схемаи барқиро бор кунед.', 'Модель определила, что фото относится к другому разделу физики (механика, оптика или чертёж) и не содержит электрической цепи. Пожалуйста, загрузите фото электрической схемы.', 'The agent identified another type of image, such as mechanics, optics, or notebook notes. We do not invent components. Please upload an electrical circuit photo.')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{tx('Боргирии акси дигар', 'Загрузить другое фото', 'Upload another photo')}</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {tx('Марҳилаи тасдиқ', 'Этап проверки', 'Confirmation step')}
                        </span>
                        <h2 className="text-sm font-bold">
                          {tx('Унсурҳои шинохташуда', 'Проверка распознанных деталей', 'Review recognized components')}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {isTg
                          ? 'Пеш аз ҳисоб, лутфан унсурҳоро санҷед ва агар лозим бошад, ислоҳ намоед.'
                          : tx('Пеш аз ҳисоб унсурҳои занҷирро санҷед ва навъи унсурҳои номуайянро нишон диҳед.', 'Перед расчетом проверьте детали цепи и укажите тип для неуверенно распознанных элементов.', 'Review the circuit components and specify the type of uncertain elements before calculating.')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleVerifyConfirmedCircuit(pendingNetlist)}
                      disabled={isLoading}
                      className="w-full sm:w-auto min-h-[44px] justify-center flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{tx('Тасдиқ ва ҳисоб', 'Подтвердить и рассчитать', 'Confirm and calculate')}</span>
                    </button>
                  </div>

                  {perceptionNotice && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{perceptionNotice}</span>
                    </div>
                  )}

                  {/* Component items list optimized for 360px viewport */}
                  <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {pendingNetlist.components.map((comp, idx) => {
                      const isUnknown =
                        comp.type === 'unknown' ||
                        (comp.confidence !== undefined && comp.confidence < 0.6);
                      return (
                        <div
                          key={comp.id || idx}
                          className={`p-3 rounded-xl border flex flex-col gap-2.5 text-xs transition-all ${
                            isUnknown
                              ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700'
                              : isLight
                                ? 'bg-slate-50 border-slate-200'
                                : 'bg-slate-800/60 border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-lg shrink-0">
                                {comp.type === 'battery' && '🔋'}
                                {comp.type === 'resistor' && '⚡'}
                                {comp.type === 'led' && '🏮'}
                                {comp.type === 'lamp' && '💡'}
                                {comp.type === 'switch' && (comp.isOpen ? '🔓' : '🔒')}
                                {comp.type === 'wire' && '〰️'}
                                {comp.type === 'ammeter' && '🅰️'}
                                {comp.type === 'voltmeter' && '🆅'}
                                {comp.type === 'unknown' && '❓'}
                              </span>
                              <div className="min-w-0">
                                <input
                                  type="text"
                                  value={comp.label || comp.id}
                                  onChange={(e) =>
                                    updatePendingComponent(idx, {label: e.target.value})
                                  }
                                  className="font-bold text-xs bg-transparent border-b border-transparent hover:border-slate-400 focus:border-sky-500 outline-none w-32 truncate"
                                />
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {comp.nodeA} ↔ {comp.nodeB}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {comp.confidence !== undefined && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                    comp.confidence >= 0.8
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                                  }`}
                                >
                                  {(comp.confidence * 100).toFixed(0)}%
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removePendingComponent(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                title="Удалить"
                                aria-label="Delete component"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {isUnknown && (
                            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 bg-amber-100/60 dark:bg-amber-900/30 px-2 py-1 rounded-lg">
                              <span>⚠️</span>
                              <span>
                                {isTg
                                  ? 'Ин детал номаълум аст. Лутфан, навъи онро интихоб намоед:'
                                  : tx('Унсур бо эътимоди паст шинохта шуд. Навъи дурустро интихоб кунед:', 'Деталь распознана неуверенно. Укажите верный тип:', 'This component was recognized with low confidence. Select the correct type:')}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={comp.type}
                              onChange={(e) =>
                                updatePendingComponent(idx, {type: e.target.value as any})
                              }
                              className={`flex-1 min-w-[130px] h-9 px-2.5 rounded-lg border text-xs font-semibold outline-none transition-colors ${
                                isUnknown
                                  ? 'border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                                  : isLight
                                    ? 'border-slate-300 bg-white text-slate-800'
                                    : 'border-slate-600 bg-slate-900 text-slate-200'
                              }`}
                            >
                              <option value="battery">🔋 {tx('Батарея', 'Батарея', 'Battery')}</option>
                              <option value="resistor">⚡ {tx('Муқовимат', 'Резистор', 'Resistor')}</option>
                              <option value="lamp">💡 {tx('Лампочка', 'Лампочка', 'Lamp')}</option>
                              <option value="led">🏮 {tx('Светодиод', 'Светодиод', 'LED')}</option>
                              <option value="switch">🔒 {tx('Калид', 'Выключатель', 'Switch')}</option>
                              <option value="wire">〰️ {tx('Сим', 'Провод', 'Wire')}</option>
                              <option value="voltmeter">🆅 {tx('Вольтметр', 'Вольтметр', 'Voltmeter')}</option>
                              <option value="ammeter">🅰️ {tx('Амперметр', 'Амперметр', 'Ammeter')}</option>
                              <option value="unknown">❓ {tx('Номаълум', 'Неизвестно', 'Unknown')}</option>
                            </select>

                            {comp.type === 'switch' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  updatePendingComponent(idx, {isOpen: !comp.isOpen})
                                }
                                className={`h-9 px-3 rounded-lg text-xs font-bold border transition-colors ${
                                  comp.isOpen
                                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
                                }`}
                              >
                                {comp.isOpen
                                  ? tx('Кушода (Open)', 'Разомкнут (Open)', 'Open')
                                  : tx('Пӯшида (Closed)', 'Замкнут (Closed)', 'Closed')}
                              </button>
                            ) : comp.type === 'battery' ||
                              comp.type === 'resistor' ||
                              comp.type === 'lamp' ? (
                              <div className="flex items-center gap-1.5 h-9">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={comp.value ?? (comp.type === 'battery' ? 9 : 10)}
                                  onChange={(e) =>
                                    updatePendingComponent(idx, {
                                      value: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-20 h-9 px-2 rounded-lg border text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                />
                                <span className="text-xs text-slate-400 font-bold">
                                  {comp.type === 'battery' ? 'V' : 'Ω'}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={addPendingComponent}
                      className="min-h-[42px] px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-sky-500 hover:text-sky-500 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>+</span>
                      <span>{tx('Иловаи унсури нав', 'Добавить компонент', 'Add component')}</span>
                    </button>

                    <button
                      onClick={() => handleVerifyConfirmedCircuit(pendingNetlist)}
                      disabled={isLoading}
                      className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white shadow-md active:scale-95 transition-all"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>{tx('Тасдиқ ва оғози ҳисоби MNA', 'Подтвердить и запустить MNA расчет', 'Confirm and run MNA calculation')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Circuit Schema & Before/After Comparison Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {tx('2. Нақша ва верификатсия', '2. Схема и верификация', '2. Circuit and verification')}
                </span>
                {agentResult?.hasMistake && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {tx('Хато ислоҳ шуд', 'Ошибка исправлена', 'Error fixed')}
                  </span>
                )}
                {agentResult?.originalNetlist && !isReviewing && (
                  <button
                    onClick={() => {
                      setPendingNetlist(agentResult.originalNetlist);
                      setIsReviewing(true);
                    }}
                    className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                  >
                    ✏️ {tx('Ислоҳи унсурҳо', 'Изменить компоненты', 'Edit components')}
                  </button>
                )}
              </div>

              {/* Before / After Toggle (Only shown when a fix was synthesized) */}
              {agentResult?.hasMistake && agentResult.proposedFixNetlist && (
                <div className="flex items-center p-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                  <button
                    onClick={() => setActiveTab('before')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                      activeTab === 'before'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tx('Аввал (Хато)', 'До (С ошибкой)', 'Before (Error)')}
                  </button>
                  <button
                    onClick={() => setActiveTab('after')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                      activeTab === 'after'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tx('Баъд (Ислоҳи бехатар)', 'После (Исправлено)', 'After (Fixed)')}
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Visual Schematic Representation */}
            <div
              className={`rounded-xl p-4 border relative min-h-[220px] flex flex-col justify-between ${
                isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              {/* Components Diagram Badges */}
              <div className="flex flex-wrap items-center justify-center gap-3 py-6">
                {currentDisplayNetlist?.components.map((comp: NetlistComponent, cIdx: number) => {
                  const result = currentDisplaySolution?.elementResults[comp.id];
                  const isBlown = result?.isBlown;
                  const isIlluminated = result?.illuminated;
                  const isOverload = result?.status === 'overload';

                  return (
                    <div
                      key={comp.id}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1 min-w-[110px] text-center shadow-xs transition-transform hover:scale-105 ${
                        isBlown
                          ? 'bg-rose-100/90 dark:bg-rose-950/80 border-rose-400 text-rose-900 dark:text-rose-200'
                          : isIlluminated
                            ? 'bg-amber-100/90 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-200 animate-pulse'
                            : isOverload
                              ? 'bg-orange-100 dark:bg-orange-950/80 border-orange-400 text-orange-900 dark:text-orange-200'
                              : isLight
                                ? 'bg-white border-slate-300 text-slate-800'
                                : 'bg-slate-800 border-slate-700 text-slate-100'
                      }`}
                    >
                      <div className="text-xl">
                        {comp.type === 'battery' && '🔋'}
                        {comp.type === 'resistor' && '⚡'}
                        {comp.type === 'led' && (isBlown ? '💥' : isIlluminated ? '💡' : '🏮')}
                        {comp.type === 'lamp' && (isBlown ? '💥' : isIlluminated ? '💡' : '🛋️')}
                        {comp.type === 'switch' && (comp.isOpen ? '🔓' : '🔒')}
                        {comp.type === 'wire' && '〰️'}
                      </div>
                      <div className="text-xs font-bold leading-tight">{comp.label || comp.id}</div>
                      <div className="text-[10px] opacity-75 font-mono">
                        {comp.nodeA} ↔ {comp.nodeB}
                      </div>

                      {/* Solved electrical values */}
                      {result && (
                        <div className="text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-mono">
                          {result.current !== undefined && `${(result.current * 1000).toFixed(1)} mA`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Telemetry Bar */}
              <div
                className={`pt-3 border-t flex items-center justify-between gap-4 text-xs font-semibold ${
                  isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span>
                    I ={' '}
                    <strong className="text-sky-600 dark:text-sky-400 font-mono">
                      {currentDisplaySolution?.totalCurrent !== undefined
                        ? `${currentDisplaySolution.totalCurrent} A`
                        : '—'}
                    </strong>
                  </span>
                  <span>
                    R_экв ={' '}
                    <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                      {currentDisplaySolution?.totalEquivalentResistance !== undefined
                        ? `${currentDisplaySolution.totalEquivalentResistance} Ω`
                        : '—'}
                    </strong>
                  </span>
                  <span>
                    Статус:{' '}
                    <strong
                      className={`font-bold ${
                        currentDisplaySolution?.status === 'ok'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {currentDisplaySolution?.status || 'unsolved'}
                    </strong>
                  </span>
                </div>

                {/* Open in Interactive Workbench Button */}
                <button
                  onClick={() => {
                    if (currentDisplayNetlist) {
                      loadNetlistIntoWorkbench(currentDisplayNetlist);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-all active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{tx('Дар мизи корӣ кушоед', 'Открыть на монтажном столе', 'Open on workbench')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Teacher Explanation Card */}
          {agentResult?.explanation && (
            <div
              className={`p-5 rounded-2xl border transition-all ${
                isLight
                  ? 'bg-gradient-to-br from-amber-50/50 via-white to-sky-50/30 border-amber-200 shadow-xs'
                  : 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    👨‍🏫
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {agentResult.explanation.title}
                    </h3>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {tx('Тавзеҳи соддакардашуда барои мактабҳои бе озмоишгоҳ', 'Пошаговое объяснение учителя физики для школ без физкабинета', 'Step-by-step physics teacher explanation for schools without a laboratory')}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {agentResult.explanation.physicsLaw}
                </span>
              </div>

              {/* What went wrong */}
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {agentResult.explanation.whatWentWrong}
              </p>

              {/* Formula & Derivation steps */}
              <div className="mt-3.5 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  {tx('Ҳисоби математикии формулаҳо:', 'Математический расчёт по формулам:', 'Mathematical calculation from formulas:')}
                </div>
                <div className="flex flex-col gap-1 text-xs font-mono text-slate-800 dark:text-slate-200">
                  {agentResult.explanation.formulaSteps.map((step: string, sIdx: number) => (
                    <div key={sIdx} className="leading-relaxed">
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              {/* How to fix instructions */}
              <div className="mt-3.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">{tx('Чӣ бояд кард: ', 'Как исправить: ', 'How to fix: ')}</strong>
                  <span>{agentResult.explanation.howToFix}</span>
                </div>
              </div>

              {/* Safety note */}
              {agentResult.explanation.safetyNote && (
                <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{agentResult.explanation.safetyNote}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
