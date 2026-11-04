/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Интерактивный 3D Монтажный Стол Лаборатории
 * Полная синхронизация 2D и 3D: добавление приборов, проведение реакций,
 * построение кинематических механизмов и расчет точной физики.
 */

import React, {useRef, useEffect, useState, useMemo, useCallback} from 'react';
import {
  Activity,
  AlertTriangle,
  Beaker,
  Boxes,
  Camera,
  Cog,
  Eye,
  Flame,
  Gauge,
  Layers,
  Lightbulb,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  Power,
  RotateCcw,
  Sliders,
  Sparkles,
  Thermometer,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {useLabStore} from '../../../store/useLabStore.ts';
import {t} from '../../../../../shared/i18n.ts';
import {CircuitComponent} from '../../../../../shared/types.ts';
import {Workbench3DSceneManager} from './Workbench3DScene.ts';
import {
  ActiveInstrument,
  InstrumentType,
  MechanismState,
  ReactionState,
} from '../types.ts';
import {
  calculateMechanismPhysics,
  calculateReactionPhysics,
  generateInstrumentTelemetry,
} from '../scienceEngine.ts';

export const Workbench3DView: React.FC = () => {
  const {
    language,
    theme,
    components,
    wires,
    simulationResult,
    selectedComponentId,
    addComponent,
    removeComponent,
    updateComponentValue,
    updateComponentPosition,
    toggleSwitch,
    selectComponent,
    runSimulation,
    clearWorkbench,
    loadPreset,
  } = useLabStore();

  const isLight = theme === 'light';
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneManagerRef = useRef<Workbench3DSceneManager | null>(null);

  const [hoveredComp, setHoveredComp] = useState<CircuitComponent | null>(null);
  const [activeTab, setActiveTab] = useState<'components' | 'instruments' | 'reactions' | 'mechanisms'>('components');
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front'>('iso');
  const [showInteractionHint, setShowInteractionHint] = useState(() => {
    try {
      return sessionStorage.getItem('ozmo-3d-hint-dismissed') !== '1';
    } catch {
      return true;
    }
  });

  // =========================================================================
  // СОСТОЯНИЕ РЕАКЦИЙ (ХИМИКО-ФИЗИЧЕСКАЯ СТАНЦИЯ)
  // =========================================================================
  const [showReactions, setShowReactions] = useState<boolean>(false);
  const [reactionType, setReactionType] = useState<'titration' | 'precipitation' | 'electrolysis'>('titration');
  const [titrantAddedMl, setTitrantAddedMl] = useState<number>(24.5);
  const [stirrerSpeedRpm, setStirrerSpeedRpm] = useState<number>(450);
  const [isStirrerOn, setIsStirrerOn] = useState<boolean>(true);
  const [currentElectrolysisA, setCurrentElectrolysisA] = useState<number>(1.8);
  const [reactionElapsedSec, setReactionElapsedSec] = useState<number>(12);

  const reactionPhysics: ReactionState = useMemo(() => {
    return calculateReactionPhysics({
      reactionType,
      titrantAddedMl,
      acidMolarity: 0.1,
      baseMolarity: 0.1,
      initialVolumeMl: 25.0,
      stirrerSpeedRpm,
      isStirrerOn,
      currentElectrolysisA,
      elapsedSec: reactionElapsedSec,
    });
  }, [reactionType, titrantAddedMl, stirrerSpeedRpm, isStirrerOn, currentElectrolysisA, reactionElapsedSec]);

  // =========================================================================
  // СОСТОЯНИЕ МЕХАНИЗМОВ (КИНЕМАТИКА И ТЕОРМЕХ)
  // =========================================================================
  const [showMechanisms, setShowMechanisms] = useState<boolean>(false);
  const [mechanismType, setMechanismType] = useState<'gears' | 'pulley' | 'slider_crank'>('gears');
  const [isMotorOn, setIsMotorOn] = useState<boolean>(true);
  const [motorRpm, setMotorRpm] = useState<number>(120);
  const [inputTorqueNm, setInputTorqueNm] = useState<number>(4.5);
  const [pulleySheaves, setPulleySheaves] = useState<1 | 2 | 4>(2);
  const [loadMassKg, setLoadMassKg] = useState<number>(15);
  const [gear3Teeth, setGear3Teeth] = useState<number>(36);

  const mechanismPhysics: MechanismState = useMemo(() => {
    return calculateMechanismPhysics(
      {
        mechanismType,
        isMotorOn,
        motorRpm,
        inputTorqueNm,
        gear1Teeth: 18,
        gear2Teeth: 24,
        gear3Teeth,
        pulleySheaves,
        loadMassKg,
        crankRadiusCm: 6,
        connectingRodCm: 18,
      },
      reactionElapsedSec
    );
  }, [mechanismType, isMotorOn, motorRpm, inputTorqueNm, gear3Teeth, pulleySheaves, loadMassKg, reactionElapsedSec]);

  // =========================================================================
  // СТОЙКА ИЗМЕРИТЕЛЬНЫХ ПРИБОРОВ (ACTIVE INSTRUMENTS)
  // =========================================================================
  const [activeInstruments, setActiveInstruments] = useState<ActiveInstrument[]>([
    {
      id: 'inst_multimeter',
      type: 'multimeter',
      name: 'Fluke 87V True-RMS',
      primaryValue: '4.50 V',
      secondaryValue: 'DC True RMS',
      unit: 'V',
      status: 'active',
      positionIndex: 0,
    },
    {
      id: 'inst_power_supply',
      type: 'power_supply',
      name: 'DC Bench Power Supply',
      primaryValue: '9.00 V',
      secondaryValue: '0.450 A',
      unit: 'CV Mode',
      status: 'active',
      positionIndex: 1,
    },
  ]);

  // Таймер для плавных реакций и кинематики
  useEffect(() => {
    const interval = setInterval(() => {
      setReactionElapsedSec((prev) => prev + 0.2);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Инициализация Three.js сцены монтажного стола
  useEffect(() => {
    if (!mountRef.current) return;

    const manager = new Workbench3DSceneManager(mountRef.current, isLight, {
      onToggleSwitch: (id) => {
        toggleSwitch(id);
        runSimulation();
      },
      onSelectComponent: (id) => {
        selectComponent(id);
      },
      onMoveComponent: (id, x2d, y2d) => {
        updateComponentPosition(id, x2d, y2d);
      },
      onHoverComponent: (comp) => {
        setHoveredComp(comp);
      },
    });

    sceneManagerRef.current = manager;

    // Первичная синхронизация
    manager.syncComponents(components, simulationResult, selectedComponentId);
    manager.syncWires(wires);
    manager.setReactionsVisible(showReactions);
    manager.updateReactionState(reactionPhysics);
    manager.setMechanismsVisible(showMechanisms);
    manager.updateMechanismState(mechanismPhysics);
    manager.updateInstruments(activeInstruments);

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, [isLight]);

  // Синхронизация компонентов и проводов при изменении стора
  useEffect(() => {
    sceneManagerRef.current?.syncComponents(components, simulationResult, selectedComponentId);
  }, [components, simulationResult, selectedComponentId]);

  useEffect(() => {
    sceneManagerRef.current?.syncWires(wires);
  }, [wires]);

  useEffect(() => {
    sceneManagerRef.current?.setReactionsVisible(showReactions);
    if (showReactions) {
      sceneManagerRef.current?.updateReactionState(reactionPhysics);
    }
  }, [showReactions, reactionPhysics]);

  useEffect(() => {
    sceneManagerRef.current?.setMechanismsVisible(showMechanisms);
    if (showMechanisms) {
      sceneManagerRef.current?.updateMechanismState(mechanismPhysics);
    }
  }, [showMechanisms, mechanismPhysics]);

  useEffect(() => {
    // Обновляем телеметрию приборов
    const updated = activeInstruments.map((inst) => {
      const telem = generateInstrumentTelemetry(inst.type, {
        reaction: showReactions ? reactionPhysics : undefined,
        mechanism: showMechanisms ? mechanismPhysics : undefined,
      });
      return {
        ...inst,
        primaryValue: telem.primaryValue,
        secondaryValue: telem.secondaryValue,
        unit: telem.unit,
        status: telem.status,
      };
    });
    sceneManagerRef.current?.updateInstruments(updated);
  }, [activeInstruments, reactionPhysics, mechanismPhysics, showReactions, showMechanisms]);

  // Добавление нового прибора на стойку
  const handleAddInstrument = (type: InstrumentType) => {
    if (activeInstruments.some((i) => i.type === type)) return;
    const names: Record<InstrumentType, string> = {
      multimeter: 'Fluke 87V Multimeter',
      power_supply: 'DC Bench Power Supply',
      ph_meter: 'Digital pH / ISE Meter',
      thermometer: 'Precision Pt100 Thermometer',
      dynamometer: 'Digital Dynamometer',
      tachometer: 'Laser Optical Tachometer',
    };
    const telem = generateInstrumentTelemetry(type, {
      reaction: reactionPhysics,
      mechanism: mechanismPhysics,
    });
    const newInst: ActiveInstrument = {
      id: `inst_${type}_${Date.now()}`,
      type,
      name: names[type],
      primaryValue: telem.primaryValue,
      secondaryValue: telem.secondaryValue,
      unit: telem.unit,
      status: telem.status,
      positionIndex: activeInstruments.length,
    };
    setActiveInstruments([...activeInstruments, newInst]);
  };

  const handleRemoveInstrument = (id: string) => {
    setActiveInstruments(activeInstruments.filter((i) => i.id !== id));
  };

  const handleCameraChange = (preset: 'iso' | 'top' | 'front') => {
    setCameraPreset(preset);
    sceneManagerRef.current?.setCameraPreset(preset);
  };

  // Автоматическое соединение компонентов и приборов реалистичными проводами
  const handleAutoWireCircuit = () => {
    if (components.length === 0) {
      loadPreset();
      return;
    }

    const {wires: currentWires} = useLabStore.getState();
    const newWires = [...currentWires];

    const battery = components.find((c) => c.type === 'battery' || c.type === 'power_source');
    const sw = components.find((c) => c.type === 'switch');
    const load = components.find((c) => c.type === 'lamp' || c.type === 'resistor' || c.type === 'rheostat');
    const ammeter = components.find((c) => c.type === 'ammeter');
    const voltmeter = components.find((c) => c.type === 'voltmeter');

    if (battery && load) {
      // Очищаем старые провода для создания красивой чистой разводки
      newWires.length = 0;

      // 1. Плюс источника питания
      if (sw) {
        newWires.push({
          id: `wire_auto_${Date.now()}_1`,
          from: {componentId: battery.id, terminalId: 'pos'},
          to: {componentId: sw.id, terminalId: 'term_a'},
        });

        if (ammeter) {
          // Рубильник -> Амперметр -> Нагрузка
          newWires.push({
            id: `wire_auto_${Date.now()}_2`,
            from: {componentId: sw.id, terminalId: 'term_b'},
            to: {componentId: ammeter.id, terminalId: 'term_a'},
          });
          newWires.push({
            id: `wire_auto_${Date.now()}_3`,
            from: {componentId: ammeter.id, terminalId: 'term_b'},
            to: {componentId: load.id, terminalId: 'term_a'},
          });
        } else {
          newWires.push({
            id: `wire_auto_${Date.now()}_2`,
            from: {componentId: sw.id, terminalId: 'term_b'},
            to: {componentId: load.id, terminalId: 'term_a'},
          });
        }
      } else if (ammeter) {
        newWires.push({
          id: `wire_auto_${Date.now()}_1`,
          from: {componentId: battery.id, terminalId: 'pos'},
          to: {componentId: ammeter.id, terminalId: 'term_a'},
        });
        newWires.push({
          id: `wire_auto_${Date.now()}_2`,
          from: {componentId: ammeter.id, terminalId: 'term_b'},
          to: {componentId: load.id, terminalId: 'term_a'},
        });
      } else {
        newWires.push({
          id: `wire_auto_${Date.now()}_1`,
          from: {componentId: battery.id, terminalId: 'pos'},
          to: {componentId: load.id, terminalId: 'term_a'},
        });
      }

      // 2. Возврат с нагрузки на минус источника
      newWires.push({
        id: `wire_auto_${Date.now()}_4`,
        from: {componentId: load.id, terminalId: 'term_b'},
        to: {componentId: battery.id, terminalId: 'neg'},
      });

      // 3. Вольтметр (параллельно нагрузке)
      if (voltmeter) {
        newWires.push({
          id: `wire_auto_${Date.now()}_5`,
          from: {componentId: voltmeter.id, terminalId: 'term_a'},
          to: {componentId: load.id, terminalId: 'term_a'},
        });
        newWires.push({
          id: `wire_auto_${Date.now()}_6`,
          from: {componentId: voltmeter.id, terminalId: 'term_b'},
          to: {componentId: load.id, terminalId: 'term_b'},
        });
      }

      useLabStore.setState({wires: newWires});
      runSimulation();
    }
  };

  // Подключение выбранного вольтметра параллельно нагрузке
  const handleConnectVoltmeter = (voltComp: CircuitComponent) => {
    const load = components.find((c) => (c.type === 'lamp' || c.type === 'resistor' || c.type === 'rheostat') && c.id !== voltComp.id);
    if (!load) return;

    const {wires: currentWires} = useLabStore.getState();
    const filtered = currentWires.filter((w) => w.from.componentId !== voltComp.id && w.to.componentId !== voltComp.id);

    filtered.push({
      id: `wire_vm_${Date.now()}_a`,
      from: {componentId: voltComp.id, terminalId: 'term_a'},
      to: {componentId: load.id, terminalId: 'term_a'},
    });
    filtered.push({
      id: `wire_vm_${Date.now()}_b`,
      from: {componentId: voltComp.id, terminalId: 'term_b'},
      to: {componentId: load.id, terminalId: 'term_b'},
    });

    useLabStore.setState({wires: filtered});
    runSimulation();
  };

  // Включение выбранного амперметра последовательно в цепь
  const handleConnectAmmeter = (ammComp: CircuitComponent) => {
    const battery = components.find((c) => c.type === 'battery' || c.type === 'power_source');
    const load = components.find((c) => (c.type === 'lamp' || c.type === 'resistor' || c.type === 'rheostat') && c.id !== ammComp.id);
    if (!battery || !load) return;

    const {wires: currentWires} = useLabStore.getState();
    // Убираем прямое соединение от источника к нагрузке и заменяем через амперметр
    const filtered = currentWires.filter((w) => {
      const isDirectPos = (w.from.componentId === battery.id && w.to.componentId === load.id) ||
                          (w.to.componentId === battery.id && w.from.componentId === load.id);
      const isThisAmm = w.from.componentId === ammComp.id || w.to.componentId === ammComp.id;
      return !isDirectPos && !isThisAmm;
    });

    filtered.push({
      id: `wire_am_${Date.now()}_a`,
      from: {componentId: battery.id, terminalId: 'pos'},
      to: {componentId: ammComp.id, terminalId: 'term_a'},
    });
    filtered.push({
      id: `wire_am_${Date.now()}_b`,
      from: {componentId: ammComp.id, terminalId: 'term_b'},
      to: {componentId: load.id, terminalId: 'term_a'},
    });

    useLabStore.setState({wires: filtered});
    runSimulation();
  };

  // Выбранный компонент для панели инспектора
  const selectedComp = components.find((c) => c.id === selectedComponentId);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none">
      {/* Three.js 3D Canvas Контейнер */}
      <div ref={mountRef} className="absolute inset-x-0 top-0 bottom-20 w-full cursor-grab active:cursor-grabbing sm:inset-0" />

      {/* ВЕРХНЯЯ ПАНЕЛЬ ИНСТРУМЕНТОВ 3D СТОЛА */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 p-2 sm:p-3 pointer-events-none">
        {/* Левая группа: Режимы и добавление элементов */}
        <div className="touch-scroll-strip flex max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200/90 bg-white/90 p-1 backdrop-blur-md shadow-md pointer-events-auto dark:border-slate-800 dark:bg-slate-900/90">
          <button
            onClick={() => setActiveTab('components')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'components'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Компоненты</span>
          </button>

          <button
            onClick={() => setActiveTab('instruments')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'instruments'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>Приборы ({activeInstruments.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('reactions');
              setShowReactions(true);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'reactions'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Beaker className="w-3.5 h-3.5 text-purple-400" />
            <span>Реакции</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('mechanisms');
              setShowMechanisms(true);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'mechanisms'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Cog className="w-3.5 h-3.5 text-amber-500" />
            <span>Механизмы</span>
          </button>
        </div>

        {/* Правая группа: Ракурс камеры и запуск расчета */}
        <div className="touch-scroll-strip flex max-w-full items-center gap-2 overflow-x-auto pointer-events-auto">
          {/* Переключение ракурса камеры */}
          <div className="flex items-center p-1 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-md">
            <button
              onClick={() => handleCameraChange('iso')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                cameraPreset === 'iso' ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold' : 'text-slate-500'
              }`}
              title="3D Изометрия"
            >
              3D Изо
            </button>
            <button
              onClick={() => handleCameraChange('top')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                cameraPreset === 'top' ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold' : 'text-slate-500'
              }`}
              title="Вид сверху"
            >
              Сверху
            </button>
            <button
              onClick={() => handleCameraChange('front')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                cameraPreset === 'front' ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold' : 'text-slate-500'
              }`}
              title="Крупный план"
            >
              Фронт
            </button>
          </div>

          {/* Кнопка автоматического соединения цепи проводами */}
          <button
            onClick={handleAutoWireCircuit}
            className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:bg-amber-400 active:scale-95 cursor-pointer sm:flex"
            title="Автоматически соединить компоненты и приборы лабораторными проводами"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>⚡ Соединить цепь</span>
          </button>

          {/* Запуск расчета физики */}
          <button
            onClick={runSimulation}
            className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-95 cursor-pointer sm:flex"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('workbench.btn.run', language)}</span>
          </button>
        </div>

        <div className="touch-scroll-strip safe-bottom absolute inset-x-2 bottom-2 z-20 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:hidden">
          <button
            type="button"
            onClick={handleAutoWireCircuit}
            className="min-h-11 min-w-11 flex-1 shrink-0 rounded-xl bg-amber-500 px-3 text-xs font-bold text-slate-950 shadow-md active:scale-95"
          >
            <Zap className="mx-auto h-4 w-4 fill-current" />
            <span className="sr-only">Connect circuit</span>
          </button>
          <button
            type="button"
            onClick={runSimulation}
            className="min-h-11 min-w-11 flex-1 shrink-0 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-md active:scale-95"
          >
            <Play className="mx-auto h-4 w-4 fill-current" />
            <span className="sr-only">Calculate</span>
          </button>
        </div>
      </div>

      {/* ВТОРАЯ СТРОКА: БЫСТРОЕ ДОБАВЛЕНИЕ В 3D СЦЕНУ */}
      <div className="relative z-10 px-3 pb-2 flex items-center gap-1.5 overflow-x-auto pointer-events-none">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm pointer-events-auto">
          {activeTab === 'components' && (
            <>
              <button
                onClick={() => addComponent('battery')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>Батарея 9V</span>
              </button>
              <button
                onClick={() => addComponent('lamp')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>Лампа</span>
              </button>
              <button
                onClick={() => addComponent('switch')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>Рубильник</span>
              </button>
              <button
                onClick={() => addComponent('resistor')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>Резистор 10Ω</span>
              </button>
              <button
                onClick={() => addComponent('rheostat')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>Реостат</span>
              </button>
              <button
                onClick={() => addComponent('voltmeter')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>Вольтметр</span>
              </button>
              <button
                onClick={() => addComponent('ammeter')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>Амперметр</span>
              </button>
            </>
          )}

          {activeTab === 'instruments' && (
            <>
              <button
                onClick={() => handleAddInstrument('multimeter')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>+ Fluke 87V</span>
              </button>
              <button
                onClick={() => handleAddInstrument('power_supply')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>+ Блок питания 30V</span>
              </button>
              <button
                onClick={() => handleAddInstrument('ph_meter')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>+ pH-метр</span>
              </button>
              <button
                onClick={() => handleAddInstrument('thermometer')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>+ Термометр Pt100</span>
              </button>
              <button
                onClick={() => handleAddInstrument('dynamometer')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>+ Динамометр</span>
              </button>
            </>
          )}

          {activeTab === 'reactions' && (
            <>
              <button
                onClick={() => setReactionType('titration')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  reactionType === 'titration' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Титрование (HCl + NaOH)
              </button>
              <button
                onClick={() => setReactionType('precipitation')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  reactionType === 'precipitation' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Осадок (AgNO3 + NaCl)
              </button>
              <button
                onClick={() => setReactionType('electrolysis')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  reactionType === 'electrolysis' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Электролиз Фарадея (H2O)
              </button>
            </>
          )}

          {activeTab === 'mechanisms' && (
            <>
              <button
                onClick={() => setMechanismType('gears')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  mechanismType === 'gears' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Зубчатый редуктор
              </button>
              <button
                onClick={() => setMechanismType('pulley')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  mechanismType === 'pulley' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Полиспаст (Блоки)
              </button>
              <button
                onClick={() => setMechanismType('slider_crank')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  mechanismType === 'slider_crank' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Кривошип-шатун
              </button>
            </>
          )}
        </div>
      </div>

      {/* ПЛАВАЮЩИЙ ИНСПЕКТОР / ПАНЕЛЬ УПРАВЛЕНИЯ СПРАВА */}
      <div className="absolute right-3 top-20 z-20 w-80 max-h-[calc(100%-6rem)] overflow-y-auto space-y-2 pointer-events-auto">
        {/* Панель выбранного элемента цепи */}
        {selectedComp && (
          <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                  <Activity className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {t(selectedComp.type === 'lamp' ? 'component.lamp' : selectedComp.type === 'battery' ? 'component.battery' : selectedComp.type === 'switch' ? 'component.switch' : selectedComp.type === 'rheostat' ? 'component.rheostat' : 'component.resistor', language)}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono">ID: {selectedComp.id.slice(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => removeComponent(selectedComp.id)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Параметры компонента */}
            {selectedComp.type === 'switch' && (
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    toggleSwitch(selectedComp.id);
                    runSimulation();
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedComp.state.isOpen === false
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{selectedComp.state.isOpen === false ? 'Цепь замкнута (ВКЛ)' : 'Цепь разомкнута (ВЫКЛ)'}</span>
                </button>
              </div>
            )}

            {selectedComp.type === 'rheostat' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Сопротивление R:</span>
                  <span className="font-mono text-sky-600 dark:text-sky-400">{selectedComp.values.resistance || 25} Ω</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={selectedComp.values.resistance || 25}
                  onChange={(e) => {
                    updateComponentValue(selectedComp.id, 'resistance', Number(e.target.value));
                    runSimulation();
                  }}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
              </div>
            )}

            {selectedComp.type === 'battery' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Напряжение источника:</span>
                  <span className="font-mono text-sky-600 dark:text-sky-400">{selectedComp.values.voltage || 9} V</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="24"
                  step="0.5"
                  value={selectedComp.values.voltage || 9}
                  onChange={(e) => {
                    updateComponentValue(selectedComp.id, 'voltage', Number(e.target.value));
                    runSimulation();
                  }}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
              </div>
            )}

            {/* Специальный блок управления и подключения Вольтметра */}
            {selectedComp.type === 'voltmeter' && (
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Показание U:</span>
                    <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-300">
                      {Math.abs(simulationResult?.componentStates[selectedComp.id]?.voltageDrop || 0).toFixed(2)} V
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Шкалы: 0–3V / 0–15V</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">Класс 1.5</span>
                  </div>
                </div>
                <button
                  onClick={() => handleConnectVoltmeter(selectedComp)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>⚡ Подключить к нагрузке (параллельно)</span>
                </button>
              </div>
            )}

            {/* Специальный блок управления и подключения Амперметра */}
            {selectedComp.type === 'ammeter' && (
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Сила тока I:</span>
                    <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-300">
                      {Math.abs(simulationResult?.componentStates[selectedComp.id]?.current || 0) >= 1
                        ? `${Math.abs(simulationResult?.componentStates[selectedComp.id]?.current || 0).toFixed(3)} A`
                        : `${(Math.abs(simulationResult?.componentStates[selectedComp.id]?.current || 0) * 1000).toFixed(1)} mA`}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Шкалы: 0–0.6A / 0–3A</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">ГОСТ 8711-93</span>
                  </div>
                </div>
                <button
                  onClick={() => handleConnectAmmeter(selectedComp)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>⚡ Включить в цепь (последовательно)</span>
                </button>
              </div>
            )}

            {/* Физические показания MNA симулятора */}
            {simulationResult?.componentStates[selectedComp.id] && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <span className="text-slate-500 block text-[10px]">Ток I:</span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-300">
                    {(simulationResult.componentStates[selectedComp.id].current * 1000).toFixed(1)} mA
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <span className="text-slate-500 block text-[10px]">Падение U:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-300">
                    {simulationResult.componentStates[selectedComp.id].voltageDrop.toFixed(2)} V
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Инспектор Реакций */}
        {showReactions && activeTab === 'reactions' && (
          <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-purple-200 dark:border-purple-900/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Beaker className="w-4 h-4 text-purple-500" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                  Химический реактор
                </h4>
              </div>
              <span
                className="w-3 h-3 rounded-full border border-slate-400"
                style={{backgroundColor: reactionPhysics.liquidColor}}
                title="Цвет индикатора"
              />
            </div>

            {reactionType === 'titration' && (
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between font-semibold">
                    <span>Титрант NaOH (мл):</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400">{titrantAddedMl.toFixed(1)} мл</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.2"
                    value={titrantAddedMl}
                    onChange={(e) => setTitrantAddedMl(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                    <span className="text-purple-600 dark:text-purple-300 block text-[10px]">Водородный показ. pH:</span>
                    <span className="font-mono font-bold text-base text-purple-700 dark:text-purple-200">
                      {reactionPhysics.ph.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <span className="text-slate-500 block text-[10px]">Температура раствора:</span>
                    <span className="font-mono font-bold text-base text-amber-600 dark:text-amber-300">
                      {reactionPhysics.temperatureC.toFixed(1)} °C
                    </span>
                  </div>
                </div>
              </div>
            )}

            {reactionType === 'electrolysis' && (
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between font-semibold">
                    <span>Ток электролиза I:</span>
                    <span className="font-mono text-sky-600 dark:text-sky-400">{currentElectrolysisA.toFixed(1)} A</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    value={currentElectrolysisA}
                    onChange={(e) => setCurrentElectrolysisA(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40">
                    <span className="text-sky-600 dark:text-sky-400 block text-[10px]">Выход H₂ (Катод):</span>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-200">{reactionPhysics.gasH2Ml.toFixed(1)} мл</span>
                  </div>
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40">
                    <span className="text-sky-600 dark:text-sky-400 block text-[10px]">Выход O₂ (Анод):</span>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-200">{reactionPhysics.gasO2Ml.toFixed(1)} мл</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Инспектор Механизмов */}
        {showMechanisms && activeTab === 'mechanisms' && (
          <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-amber-200 dark:border-amber-900/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Cog className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                  Теоретическая механика
                </h4>
              </div>
              <button
                onClick={() => setIsMotorOn(!isMotorOn)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isMotorOn ? 'bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {isMotorOn ? 'МОТОР ВКЛ' : 'СТОП'}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between font-semibold">
                  <span>Обороты мотора (RPM):</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400">{motorRpm} об/мин</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  step="10"
                  value={motorRpm}
                  onChange={(e) => setMotorRpm(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              {mechanismType === 'gears' && (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40">
                    <span className="text-amber-600 dark:text-amber-400 block text-[10px]">Коэф. редуктора i:</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-200">{mechanismPhysics.gearRatio.toFixed(2)}x</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40">
                    <span className="text-amber-600 dark:text-amber-400 block text-[10px]">Выходной момент:</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-200">{mechanismPhysics.outputTorqueNm.toFixed(2)} N·m</span>
                  </div>
                </div>
              )}

              {mechanismType === 'pulley' && (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40">
                    <span className="text-sky-600 dark:text-sky-400 block text-[10px]">Натяжение троса:</span>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-200">{mechanismPhysics.pulleyTensionN.toFixed(1)} N</span>
                  </div>
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40">
                    <span className="text-sky-600 dark:text-sky-400 block text-[10px]">Масса груза:</span>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-200">{loadMassKg} kg</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* НИЖНЯЯ СТАТУСНАЯ ПОДСКАЗКА */}
      {showInteractionHint && (
      <div className="absolute bottom-24 left-2 right-2 z-10 mx-auto max-w-md rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-white/90 shadow-lg backdrop-blur-md sm:bottom-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:rounded-full">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span className="min-w-0 flex-1">
          {hoveredComp
            ? language === 'en'
              ? `Selected: ${hoveredComp.type} • Drag with the left mouse button to move`
              : language === 'ru'
                ? `Выбран: ${hoveredComp.type} • Зажмите ЛКМ для перемещения по столу`
                : `Интихоб шуд: ${hoveredComp.type} • Барои ҳаракат бо тугмаи чап кашед`
            : language === 'en'
              ? 'Click the switch to close the circuit • Drag with the mouse to rotate • Use the wheel to zoom'
              : language === 'ru'
                ? 'Кликните по рубильнику для замыкания • Вращайте сцену ЛКМ • Масштабируйте колесом мыши'
                : 'Барои бастани занҷир ба калид клик кунед • Барои гардиш бо муш кашед • Барои масштаб чархро истифода баред'}
          </span>
          <button
            type="button"
            aria-label="Dismiss hint"
            onClick={() => {
              setShowInteractionHint(false);
              try {
                sessionStorage.setItem('ozmo-3d-hint-dismissed', '1');
              } catch {
                // Session storage is optional in private browsing contexts.
              }
            }}
            className="min-h-7 min-w-7 shrink-0 rounded-full text-slate-300 hover:bg-white/10"
          >
            <X className="mx-auto h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      )}
    </div>
  );
};
