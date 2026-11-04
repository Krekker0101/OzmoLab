/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Notebook Problem Studio (Centre of Mass & Resistance Solver with Socratic Tutor)
 * Meta Global AI Developer Hackathon (Indie Developer Track: "Build for Your World")
 */

import React, {useState, useEffect} from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  ListOrdered,
  Award,
  Layers,
  ArrowRight,
  Upload,
  Plus,
  Trash2,
  Eye,
} from 'lucide-react';
import {
  NotebookExtractionResult,
  CentreOfMassProblem,
  PointMass,
  ResistanceProblem,
} from '../../../../shared/schema/notebook.ts';
import {
  solveCentreOfMass,
  solveResistanceProblem,
  CentreOfMassSolution,
  ResistanceSolution,
} from '../../../../shared/solver/physicsSolver.ts';
import {SupportedLanguage, t} from '../../../../shared/i18n.ts';

interface NotebookProblemStudioProps {
  uploadedImage: string | null;
  notebookResult: NotebookExtractionResult | null;
  isLight: boolean;
  isTg: boolean;
  language: SupportedLanguage;
  onUploadNewPhoto: () => void;
  onSwitchToCircuit?: () => void;
}

export const NotebookProblemStudio: React.FC<NotebookProblemStudioProps> = ({
  uploadedImage,
  notebookResult,
  isLight,
  isTg,
  language,
  onUploadNewPhoto,
  onSwitchToCircuit,
}) => {
  // Problem state (editable by student)
  const [activeProblemType, setActiveProblemType] = useState<'centre_of_mass' | 'resistance'>(
    'centre_of_mass',
  );

  const [comProblem, setComProblem] = useState<CentreOfMassProblem>({
    dimension: '1D',
    variableSymbol: '',
    items: [
      {id: 'm1', mass: 1, x: 1, y: 0, confidence: 1},
      {id: 'm2', mass: 2, x: 4, y: 0, confidence: 1},
    ],
    title: language === 'en' ? 'Center of mass in 1D' : isTg ? 'Маркази массаҳои 1D' : 'Центр масс в 1D',
  });

  const [resistanceProblem, setResistanceProblem] = useState<ResistanceProblem>({
    topology: 'series',
    voltage: 12,
    resistors: [
      {id: 'r1', resistance: 100, confidence: 1},
      {id: 'r2', resistance: 200, confidence: 1},
    ],
    target: 'total_resistance',
  });

  const [comSolution, setComSolution] = useState<CentreOfMassSolution | null>(null);
  const [resSolution, setResSolution] = useState<ResistanceSolution | null>(null);
  const [socraticTab, setSocraticTab] = useState<'hint' | 'steps' | 'answer'>('hint');
  const [isPhotoExpanded, setIsPhotoExpanded] = useState<boolean>(false);
  const [isManualBuilderActive, setIsManualBuilderActive] = useState<boolean>(false);

  // Sync when notebookResult arrives from router
  useEffect(() => {
    if (!notebookResult) return;

    if (notebookResult.centreOfMass && notebookResult.centreOfMass.items.length >= 2) {
      setActiveProblemType('centre_of_mass');
      setComProblem(notebookResult.centreOfMass);
      // Auto solve initially
      try {
        const sol = solveCentreOfMass(notebookResult.centreOfMass);
        setComSolution(sol);
      } catch (e) {
        console.warn('Initial COM solve error:', e);
      }
    } else if (notebookResult.resistanceProblem) {
      setActiveProblemType('resistance');
      setResistanceProblem(notebookResult.resistanceProblem);
      try {
        const sol = solveResistanceProblem(notebookResult.resistanceProblem);
        setResSolution(sol);
      } catch (e) {
        console.warn('Initial Res solve error:', e);
      }
    }
  }, [notebookResult]);

  // COM handlers
  const handleSolveCom = () => {
    try {
      const sol = solveCentreOfMass(comProblem);
      setComSolution(sol);
      setSocraticTab('hint');
    } catch (err) {
      console.error('Solve error:', err);
    }
  };

  const updateMassItem = (index: number, updates: Partial<PointMass>) => {
    const newItems = [...comProblem.items];
    newItems[index] = {...newItems[index], ...updates};
    setComProblem({...comProblem, items: newItems});
  };

  const addMassItem = () => {
    const newIdx = comProblem.items.length + 1;
    setComProblem({
      ...comProblem,
      items: [
        ...comProblem.items,
        {
          id: `m${newIdx}`,
          mass: 1,
          x: 0,
          y: 0,
          confidence: 1,
        },
      ],
    });
  };

  const removeMassItem = (index: number) => {
    if (comProblem.items.length <= 1) return;
    const newItems = comProblem.items.filter((_, i) => i !== index);
    setComProblem({...comProblem, items: newItems});
  };

  // Presets
  const applyPreset = (presetKey: string) => {
    if (presetKey === 'case1') {
      const p: CentreOfMassProblem = {
        dimension: '1D',
        variableSymbol: '',
        items: [
          {id: 'm1', mass: 1, x: 1, y: 0, confidence: 1},
          {id: 'm2', mass: 2, x: 4, y: 0, confidence: 1},
        ],
        title: 'm at x=1, 2m at x=4 => 3',
      };
      setComProblem(p);
      setComSolution(solveCentreOfMass(p));
    } else if (presetKey === 'case2') {
      const p: CentreOfMassProblem = {
        dimension: '1D',
        variableSymbol: 'd',
        items: [
          {id: 'm1', mass: 1, x: 0, y: 0, confidence: 1},
          {id: 'm2', mass: 3, x: 1, y: 0, confidence: 1},
        ],
        title: 'm at 0, 3m at d => 3d/4',
      };
      setComProblem(p);
      setComSolution(solveCentreOfMass(p));
    } else if (presetKey === 'case3') {
      const p: CentreOfMassProblem = {
        dimension: '2D',
        variableSymbol: 'a',
        items: [
          {id: 'm3', mass: 3, x: 0, y: 0, confidence: 1},
          {id: 'm4', mass: 4, x: 1, y: 0, confidence: 1},
          {id: 'm1', mass: 1, x: 1, y: 1, confidence: 1},
          {id: 'm2', mass: 2, x: 0, y: 1, confidence: 1},
        ],
        title: 'Square: 3m@(0,0), 4m@(a,0), m@(a,a), 2m@(0,a)',
      };
      setComProblem(p);
      setComSolution(solveCentreOfMass(p));
    }
  };

  const category = notebookResult?.classification.category;
  const isOtherNotes = category === 'other_notes';
  const isNotReadable = category === 'not_readable';

  return (
    <div className="flex flex-col gap-6">
      {/* Category Notification Banner if other_notes or not_readable */}
      {(isOtherNotes || isNotReadable) && (
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight ? 'bg-amber-50/80 border-amber-300' : 'bg-amber-950/40 border-amber-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                {isOtherNotes
                  ? isTg
                    ? 'Қайдҳои назариявӣ шинохта шуданд'
                    : language === 'en' ? 'Notes or theoretical writing detected' : 'Распознаны конспекты/теоретические записи'
                  : isTg
                    ? 'Акс хонда нашуд'
                    : language === 'en' ? 'Could not parse this photo' : 'Не удалось разобрать фото'}
              </h3>
              <p className="text-xs text-amber-900/90 dark:text-amber-300 mt-1">
                {notebookResult?.userGuidance}
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  type="button"
                  onClick={onUploadNewPhoto}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-xs hover:bg-amber-500 transition-all"
                >
                  {language === 'en' ? 'Upload another photo' : isTg ? 'Боргирии акси дигар' : 'Загрузить другое фото'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualBuilderActive(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-400 dark:border-amber-700 hover:bg-amber-100/50 transition-all text-amber-950 dark:text-amber-200"
                >
                  {language === 'en' ? 'Enter a problem manually' : isTg ? 'Масъаларо дастӣ ворид кунед' : 'Ввести задачу вручную'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Photo Preview (Never Discarded!) & Quick Presets */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Original Photo Preview Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Original notebook page' : isTg ? 'Акси аслии дафтар' : 'Оригинал страницы тетради'}</span>
              </span>
              <button
                type="button"
                onClick={onUploadNewPhoto}
                className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-semibold"
              >
                {language === 'en' ? 'replace photo' : isTg ? 'иваз кардан' : 'заменить фото'}
              </button>
            </div>

            {uploadedImage ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950/5 flex items-center justify-center">
                <img
                  src={uploadedImage}
                  alt="Original notebook upload"
                  className="max-h-64 sm:max-h-80 w-auto object-contain cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => setIsPhotoExpanded(!isPhotoExpanded)}
                />
                <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs">
                  {language === 'en' ? 'Click to enlarge' : isTg ? 'Барои калон кардан пахш намоед' : 'Клик для увеличения'}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                {language === 'en' ? 'No notebook photo uploaded' : isTg ? 'Акси дафтар бор нашудааст' : 'Фото тетради не загружено'}
              </div>
            )}
          </div>

          {/* Quick Textbook Presets */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              {language === 'en' ? 'Textbook examples (Quick test):' : isTg ? 'Намунаҳои китоби дарсӣ (Санҷиши тез):' : 'Учебные примеры (Быстрый тест):'}
            </span>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('case1')}
                className="text-left p-2.5 rounded-xl border text-xs font-semibold hover:border-sky-500 transition-all flex items-center justify-between"
              >
                <span>{language === 'en' ? '1D: m at x=1 and 2m at x=4' : isTg ? '1D: m дар x=1 ва 2m дар x=4' : '1D: m при x=1 и 2m при x=4'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                  Ҷавоб: 3
                </span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('case2')}
                className="text-left p-2.5 rounded-xl border text-xs font-semibold hover:border-sky-500 transition-all flex items-center justify-between"
              >
                <span>{language === 'en' ? '1D: m at 0 and 3m at d' : isTg ? '1D: m дар 0 ва 3m дар d' : '1D: m при 0 и 3m при d'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                  Ҷавоб: 3d/4
                </span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('case3')}
                className="text-left p-2.5 rounded-xl border text-xs font-semibold hover:border-sky-500 transition-all flex items-center justify-between"
              >
                <span>{language === 'en' ? '2D square: 3m, 4m, m, 2m with side a' : isTg ? '2D Квадрат: 3m, 4m, m, 2m бо тарафи a' : '2D квадрат: 3m, 4m, m, 2m со стороной a'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                  (a/2, 3a/10)
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Confirmation Form (Works at 360px) & Socratic Tutor */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Editable Confirmation Form */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                  {language === 'en' ? 'Student parameter confirmation' : isTg ? 'Марҳилаи тасдиқи хонанда' : 'Этап подтверждения параметров'}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {language === 'en' ? 'Center of mass (point masses)' : isTg ? 'Маркази массаҳо (Center of Mass)' : 'Центр масс точечных тел'}
                </h2>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* 1D vs 2D Toggle */}
                <div className="flex rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setComProblem({...comProblem, dimension: '1D'})}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      comProblem.dimension === '1D'
                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    1D
                  </button>
                  <button
                    type="button"
                    onClick={() => setComProblem({...comProblem, dimension: '2D'})}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      comProblem.dimension === '2D'
                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    2D
                  </button>
                </div>

                {/* Variable symbol input (e.g. d, a) */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-bold">{language === 'en' ? 'Symbol:' : 'Рамз:'}</span>
                  <input
                    type="text"
                    placeholder="d ё a"
                    value={comProblem.variableSymbol || ''}
                    onChange={(e) =>
                      setComProblem({...comProblem, variableSymbol: e.target.value})
                    }
                    className="w-16 h-8 px-2 rounded-lg border text-xs font-bold text-center bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* List of Mass Items (Responsive on 360px) */}
            <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
              {comProblem.items.map((item, idx) => {
                const isLowConfidence = item.confidence !== undefined && item.confidence < 0.6;
                return (
                  <div
                    key={item.id || idx}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-all ${
                      isLowConfidence
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700'
                        : isLight
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-slate-800/60 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {item.id}
                      </span>
                      {isLowConfidence && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                          ⚠️ {language === 'en' ? 'Check' : isTg ? 'Санҷед' : 'Проверьте'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Mass input */}
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400 font-bold">m:</span>
                        <input
                          type="number"
                          step="0.1"
                          value={item.mass}
                          onChange={(e) =>
                            updateMassItem(idx, {mass: parseFloat(e.target.value) || 0})
                          }
                          className="w-16 h-8 px-2 rounded-lg border text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      </div>

                      {/* X coordinate */}
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400 font-bold">X:</span>
                        <input
                          type="number"
                          step="0.1"
                          value={item.x}
                          onChange={(e) =>
                            updateMassItem(idx, {x: parseFloat(e.target.value) || 0})
                          }
                          className="w-16 h-8 px-2 rounded-lg border text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      </div>

                      {/* Y coordinate if 2D */}
                      {comProblem.dimension === '2D' && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-400 font-bold">Y:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={item.y ?? 0}
                            onChange={(e) =>
                              updateMassItem(idx, {y: parseFloat(e.target.value) || 0})
                            }
                            className="w-16 h-8 px-2 rounded-lg border text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeMassItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions: Add Mass & Solve */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={addMassItem}
                className="min-h-[42px] px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-sky-500 hover:text-sky-500 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Add mass' : isTg ? 'Иловаи масса' : 'Добавить массу'}</span>
              </button>

              <button
                type="button"
                onClick={handleSolveCom}
                className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white shadow-md active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{language === 'en' ? 'Calculate deterministically' : isTg ? 'Ҳал кардан бо ҳисобкунак' : 'Рассчитать детерминированно'}</span>
              </button>
            </div>
          </div>

          {/* Socratic Pedagogical Tutor Explanation Card */}
          {comSolution && (
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800 shadow-xl'
              }`}
            >
              {/* Computed Coordinates Highlight */}
              <div className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10 border border-emerald-500/20 mb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {language === 'en' ? 'Deterministic center-of-mass result' : isTg ? 'Ҳисоби детерминистии маркази массаҳо' : 'Детерминированный результат'}
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                    COM = {comSolution.formattedCoordinates}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">{language === 'en' ? 'Total mass' : isTg ? 'Массаи умумӣ' : 'Общая масса'}</span>
                  <span className="text-sm font-bold font-mono">{comSolution.totalMass}m</span>
                </div>
              </div>

              {/* Socratic Tabs */}
              <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-3">
                <button
                  type="button"
                  onClick={() => setSocraticTab('hint')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    socraticTab === 'hint'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Hint' : isTg ? 'Маслиҳат' : 'Подсказка'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSocraticTab('steps')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    socraticTab === 'steps'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Step by step' : isTg ? 'Қадам ба қадам' : 'По шагам'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSocraticTab('answer')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    socraticTab === 'answer'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Answer' : isTg ? 'Ҷавоби пурра' : 'Ответ'}</span>
                </button>
              </div>

              {/* Socratic Content Panel */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs">
                {socraticTab === 'hint' && (
                  <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold mb-1">
                        {language === 'en' ? 'Guiding question from the tutor:' : isTg ? 'Саволи роҳнамо аз омӯзгор:' : 'Наводящий вопрос наставника:'}
                      </div>
                      <p className="leading-relaxed">
                        {comSolution.tutor[language as 'tg' | 'ru' | 'en']?.hint ||
                          comSolution.tutor.tg.hint}
                      </p>
                    </div>
                  </div>
                )}

                {socraticTab === 'steps' && (
                  <div className="flex flex-col gap-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                      {language === 'en' ? 'Mathematical solution path:' : isTg ? 'Масири ҳалли математикӣ:' : 'Математический ход решения:'}
                    </div>
                    {(
                      comSolution.tutor[language as 'tg' | 'ru' | 'en']?.steps ||
                      comSolution.tutor.tg.steps
                    ).map((stepText, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px]"
                      >
                        {stepText}
                      </div>
                    ))}
                  </div>
                )}

                {socraticTab === 'answer' && (
                  <div className="flex items-start gap-2.5 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold mb-1">{language === 'en' ? 'Scientific conclusion:' : isTg ? 'Хулосаи илмӣ:' : 'Итог:'}</div>
                      <p className="font-mono font-bold text-sm">
                        {comSolution.tutor[language as 'tg' | 'ru' | 'en']?.finalAnswer ||
                          comSolution.tutor.tg.finalAnswer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
