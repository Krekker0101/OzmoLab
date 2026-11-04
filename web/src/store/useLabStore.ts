/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Zustand Store платформы виртуальных лабораторий
 */

import {create} from 'zustand';
import {
  AppTheme,
  CircuitComponent,
  LabModule,
  LabState,
  OscilloscopeDataPoint,
  PedagogyMode,
  SimulationResult,
  SupportedLanguage,
  TerminalRef,
  TutorMessage,
  UserProfile,
  Wire,
  SynthesizedCircuit,
} from '../../../shared/types.ts';
import {
  detectCircuitSynthesisIntent,
  synthesizeCircuitByKey,
  extractCircuitFromText,
} from '../utils/circuitSynthesizer.ts';
import {t} from '../../../shared/i18n.ts';
import {LabRegistry} from '../labs/registry.ts';
import '../labs/init.ts';
import offlineHints from '../../../shared/offlineHints.json';
import {NetlistCircuit} from '../../../shared/schema/netlist.ts';
import {
  calculateConnectedComponentPhysics,
  CircuitPhysicsOutput,
} from './circuitPhysicsUtility.ts';
import {
  UnitSystemMode,
  PhysicalQuantity,
  ConvertedValue,
  convertUnit as convertUnitUtil,
  autoConvertPhysicalValue,
} from './unitConversionUtility.ts';

export interface EyepieceSettings {
  zoom: number; // 100, 400, 1000
  focus: number; // 0..100 (optimal around 80-90)
  stageX: number; // offset in px
  stageY: number;
  lightIntensity: number; // 0..100
  selectedOrganelle: string | null;
}

export type JournalTab = 'observations' | 'oscilloscope' | 'theory' | 'tasks';

interface HistorySnapshot {
  components: CircuitComponent[];
  wires: Wire[];
}

interface LabStoreState {
  // Локализация, тема, навигация и режим
  language: SupportedLanguage;
  theme: AppTheme;
  currentView: 'landing' | 'lab' | 'photo-agent';
  pedagogyMode: PedagogyMode;
  isGlossaryOpen: boolean;
  isTutorOpen: boolean;
  isAccountOpen: boolean;
  is3DModeEnabled: boolean;
  userProfile: UserProfile;

  // Активная лаборатория
  activeLabId: string;
  activeLab: LabModule;

  // Состояние лаборатории
  components: CircuitComponent[];
  wires: Wire[];
  selectedComponentId: string | null;
  activeConnectingTerminal: TerminalRef | null;
  simulationResult: SimulationResult | null;
  circuitPhysics: CircuitPhysicsOutput | null;

  // История (Undo / Redo)
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];

  // Виртуальные инструменты
  showRuler: boolean;
  showProtractor: boolean;
  rulerPos: {x: number; y: number};
  protractorPos: {x: number; y: number};

  // Окуляр микроскопа (Биология)
  isEyepieceOpen: boolean;
  eyepieceSettings: EyepieceSettings;

  // Осциллограф и вкладки журнала
  activeJournalTab: JournalTab;
  oscilloscopeData: OscilloscopeDataPoint[];

  // Обучающий процесс
  activeLessonId: string | null;
  activeStepIndex: number;
  stepValidationMessage: string | null;

  // Диалог с ИИ-наставником
  tutorMessages: TutorMessage[];
  isTutorLoading: boolean;

  // Действия навигации и настроек
  setLanguage: (lang: SupportedLanguage) => void;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  setCurrentView: (view: 'landing' | 'lab' | 'photo-agent') => void;
  loadNetlistIntoWorkbench: (netlist: NetlistCircuit) => void;
  setPedagogyMode: (mode: PedagogyMode) => void;
  setGlossaryOpen: (isOpen: boolean) => void;
  setTutorOpen: (isOpen: boolean) => void;
  setAccountOpen: (isOpen: boolean) => void;
  setUserProfile: (profile: UserProfile) => void;
  selectLab: (labId: string) => void;
  set3DModeEnabled: (enabled: boolean) => void;
  toggle3DMode: () => void;

  // Манипуляция элементами монтажного стола
  addComponent: (type: string, x?: number, y?: number) => void;
  removeComponent: (id: string) => void;
  rotateComponent: (id: string) => void;
  updateComponentPosition: (id: string, x: number, y: number) => void;
  updateComponentsPhysics: (
    updates: Array<{id: string; x: number; y: number; rotation?: number}>
  ) => void;
  updateComponentValue: (id: string, key: string, value: number) => void;
  toggleSwitch: (id: string) => void;
  selectComponent: (id: string | null) => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;

  // Инструменты оптики и биологии
  toggleRuler: () => void;
  toggleProtractor: () => void;
  setRulerPos: (pos: {x: number; y: number}) => void;
  setProtractorPos: (pos: {x: number; y: number}) => void;
  setEyepieceOpen: (open: boolean) => void;
  updateEyepieceSettings: (partial: Partial<EyepieceSettings>) => void;
  setActiveJournalTab: (tab: JournalTab) => void;

  // Соединение терминалов проводами
  startConnectingTerminal: (ref: TerminalRef) => void;
  finishConnectingTerminal: (targetRef: TerminalRef) => void;
  cancelConnecting: () => void;
  removeWire: (wireId: string) => void;
  clearWorkbench: () => void;
  loadPreset: () => void;

  // Расчёт физики и единиц измерения
  runSimulation: () => void;
  calculateCircuitPhysics: () => CircuitPhysicsOutput;
  generateOscilloscopeTrace: () => void;

  // Конвертация единиц измерения
  unitSystemMode: UnitSystemMode;
  setUnitSystemMode: (mode: UnitSystemMode) => void;
  toggleUnitSystemMode: () => void;
  convertUnit: (value: number, fromUnit: string, toUnit: string, quantity?: PhysicalQuantity) => number;
  autoConvertUnit: (
    value: number,
    quantity: PhysicalQuantity,
    options?: {mode?: UnitSystemMode; targetUnit?: string; precision?: number}
  ) => ConvertedValue;

  // Уроки
  selectLesson: (lessonId: string | null) => void;
  checkLessonStep: () => boolean;
  nextLessonStep: () => void;

  // Наставник
  sendTutorMessage: (text?: string, actionType?: 'chat' | 'hint' | 'check_circuit') => Promise<void>;
  requestTutorHint: () => Promise<void>;
  checkMyCircuit: () => Promise<void>;
  applySynthesizedCircuit: (circuit: SynthesizedCircuit) => void;
}

function pushToHistory(
  past: HistorySnapshot[],
  components: CircuitComponent[],
  wires: Wire[]
): HistorySnapshot[] {
  const currentSnapshot: HistorySnapshot = {
    components: JSON.parse(JSON.stringify(components)),
    wires: JSON.parse(JSON.stringify(wires)),
  };
  return [...past.slice(-20), currentSnapshot];
}

export const useLabStore = create<LabStoreState>((set, get) => {
  const initialLab = LabRegistry.getDefault();
  const initialComponents = initialLab.defaultState?.components || [];
  const initialWires = initialLab.defaultState?.wires || [];

  const initialLabState: LabState = {
    labId: initialLab.id,
    components: initialComponents,
    wires: initialWires,
    selectedComponentId: null,
    activeConnectingTerminal: null,
    simulationResult: null,
    lastSimulatedAt: Date.now(),
  };

  const initialSimulation = initialLab.simulate(initialLabState);
  const initialCircuitPhysics = calculateConnectedComponentPhysics(initialComponents, initialWires);

  // Генерируем начальный след осциллографа
  const initialTrace: OscilloscopeDataPoint[] = [];
  const baseCurrent = initialSimulation?.totalCurrent || 0;
  for (let i = 0; i <= 60; i++) {
    const tVal = i * 0.05;
    const noise = (Math.random() - 0.5) * 0.02 * (baseCurrent > 0 ? 1 : 0);
    const ripple = Math.sin(tVal * 12) * 0.04 * (baseCurrent > 0 ? 1 : 0);
    initialTrace.push({
      t: tVal,
      current: Math.max(0, baseCurrent + ripple + noise),
      voltage: baseCurrent > 0 ? 9 + Math.sin(tVal * 10) * 0.1 : 0,
    });
  }

  return {
    language: 'tg',
    theme: 'light',
    currentView: 'landing',
    pedagogyMode: 'combined',
    isGlossaryOpen: false,
    isTutorOpen: false,
    isAccountOpen: false,
    is3DModeEnabled: true,
    unitSystemMode: 'auto',
    userProfile: {
      name: 'Фарҳод Саидов',
      role: 'student',
      city: 'Душанбе',
      school: 'Мактаб-литсейи №1',
      grade: 9,
      xp: 320,
      completedLabsCount: 3,
      badges: ['Қонуни Ом', 'Барқшиноси ҷавон', 'Пайвасти бехатар'],
    },

    activeLabId: initialLab.id,
    activeLab: initialLab,

    components: initialComponents,
    wires: initialWires,
    selectedComponentId: null,
    activeConnectingTerminal: null,
    simulationResult: initialSimulation,
    circuitPhysics: initialCircuitPhysics,

    historyPast: [],
    historyFuture: [],

    showRuler: false,
    showProtractor: false,
    rulerPos: {x: 220, y: 380},
    protractorPos: {x: 480, y: 360},

    isEyepieceOpen: false,
    eyepieceSettings: {
      zoom: 400,
      focus: 85,
      stageX: 0,
      stageY: 0,
      lightIntensity: 80,
      selectedOrganelle: null,
    },

    activeJournalTab: 'observations',
    oscilloscopeData: initialTrace,

    activeLessonId: initialLab.lessons[0]?.id || null,
    activeStepIndex: 0,
    stepValidationMessage: null,

    tutorMessages: [
      {
        id: 'msg-welcome',
        sender: 'tutor',
        text: t('tutor.welcome', 'tg'),
        timestamp: Date.now(),
        language: 'tg',
      },
    ],
    isTutorLoading: false,

    setLanguage: (language) => {
      set({language});
      const {tutorMessages} = get();
      if (tutorMessages.length === 1 && tutorMessages[0].id === 'msg-welcome') {
        set({
          tutorMessages: [
            {
              id: 'msg-welcome',
              sender: 'tutor',
              text: t('tutor.welcome', language),
              timestamp: Date.now(),
              language,
            },
          ],
        });
      }
    },

    setTheme: (theme) => set({theme}),
    toggleTheme: () => set((state) => ({theme: state.theme === 'light' ? 'dark' : 'light'})),
    setCurrentView: (currentView) => set({currentView}),
    loadNetlistIntoWorkbench: (netlist) => {
      const targetLab = LabRegistry.get('circuits-dc');
      if (!targetLab) return;

      const components: CircuitComponent[] = [];
      const netlistToUse = netlist.components.filter((c) => c.type !== 'wire');

      netlistToUse.forEach((comp, idx) => {
        // Map LED and unknown components to valid circuits-dc component types
        const type: CircuitComponent['type'] =
          comp.type === 'led'
            ? 'lamp'
            : comp.type === 'unknown'
              ? 'resistor'
              : (comp.type as CircuitComponent['type']);

        const values: Record<string, number> = {};
        if (type === 'battery') {
          values.voltage = comp.value ?? 9.0;
          values.internalResistance = comp.internalResistance ?? 0.2;
        } else if (type === 'resistor') {
          values.resistance = comp.value ?? 100.0;
        } else if (type === 'lamp') {
          values.resistance = comp.value ?? 15.0;
        } else if (type === 'ammeter') {
          values.internalResistance = comp.internalResistance ?? 0.01;
        } else if (type === 'voltmeter') {
          values.internalResistance = comp.internalResistance ?? 100000;
        }

        const total = netlistToUse.length;
        const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
        const centerX = 380;
        const centerY = 280;
        const radius = Math.min(220, 90 + total * 25);
        const x = Math.round(centerX + radius * Math.cos(angle));
        const y = Math.round(centerY + radius * Math.sin(angle));

        components.push({
          id: comp.id,
          type,
          x,
          y,
          rotation: 0,
          values,
          state: {
            isOpen: comp.isOpen ?? false,
            illuminated: false,
            brightness: 0,
          },
        });
      });

      // Map nodes to canonical circuits-dc terminals: pos/neg for battery, term_a/term_b for others
      const nodeToTerminals = new Map<string, Array<{comp: CircuitComponent; termId: string}>>();
      netlistToUse.forEach((comp, idx) => {
        const c = components[idx];
        if (!c) return;
        const termA = c.type === 'battery' ? 'pos' : 'term_a';
        const termB = c.type === 'battery' ? 'neg' : 'term_b';

        if (!nodeToTerminals.has(comp.nodeA)) nodeToTerminals.set(comp.nodeA, []);
        nodeToTerminals.get(comp.nodeA)!.push({comp: c, termId: termA});

        if (!nodeToTerminals.has(comp.nodeB)) nodeToTerminals.set(comp.nodeB, []);
        nodeToTerminals.get(comp.nodeB)!.push({comp: c, termId: termB});
      });

      const wires: Wire[] = [];
      let wireIdx = 1;
      for (const [_node, terms] of nodeToTerminals.entries()) {
        for (let i = 0; i < terms.length - 1; i++) {
          wires.push({
            id: `wire_net_${wireIdx++}`,
            from: {componentId: terms[i].comp.id, terminalId: terms[i].termId},
            to: {componentId: terms[i + 1].comp.id, terminalId: terms[i + 1].termId},
          });
        }
      }

      set({
        activeLabId: 'circuits-dc',
        activeLab: targetLab,
        currentView: 'lab',
        components,
        wires,
        selectedComponentId: null,
        historyPast: [],
        historyFuture: [],
      });

      get().runSimulation();
    },
    setPedagogyMode: (pedagogyMode) => set({pedagogyMode}),
    setGlossaryOpen: (isGlossaryOpen) => set({isGlossaryOpen}),
    setTutorOpen: (isTutorOpen) => set({isTutorOpen}),
    setAccountOpen: (isAccountOpen) => set({isAccountOpen}),
    setUserProfile: (userProfile) => set({userProfile}),
    set3DModeEnabled: (is3DModeEnabled) => set({is3DModeEnabled}),
    toggle3DMode: () => set((state) => ({is3DModeEnabled: !state.is3DModeEnabled})),

    selectLab: (labId) => {
      const targetLab = LabRegistry.get(labId);
      if (!targetLab) return;

      const components = targetLab.defaultState?.components || [];
      const wires = targetLab.defaultState?.wires || [];

      const tempState: LabState = {
        labId: targetLab.id,
        components,
        wires,
        selectedComponentId: null,
        activeConnectingTerminal: null,
        simulationResult: null,
        lastSimulatedAt: Date.now(),
      };

      const simulation = targetLab.simulate(tempState);
      const physics = calculateConnectedComponentPhysics(components, wires);

      set({
        activeLabId: targetLab.id,
        activeLab: targetLab,
        components,
        wires,
        selectedComponentId: null,
        activeConnectingTerminal: null,
        simulationResult: simulation,
        circuitPhysics: physics,
        historyPast: [],
        historyFuture: [],
        activeLessonId: targetLab.lessons[0]?.id || null,
        activeStepIndex: 0,
        stepValidationMessage: null,
        showRuler: false,
        showProtractor: false,
        isEyepieceOpen: false,
      });
      get().generateOscilloscopeTrace();
    },

    undo: () => {
      const {historyPast, historyFuture, components, wires} = get();
      if (historyPast.length === 0) return;

      const previousState = historyPast[historyPast.length - 1];
      const newPast = historyPast.slice(0, -1);
      const newFuture = [
        {
          components: JSON.parse(JSON.stringify(components)),
          wires: JSON.parse(JSON.stringify(wires)),
        },
        ...historyFuture,
      ];

      set({
        components: previousState.components,
        wires: previousState.wires,
        historyPast: newPast,
        historyFuture: newFuture,
        selectedComponentId: null,
      });
      get().runSimulation();
    },

    redo: () => {
      const {historyPast, historyFuture, components, wires} = get();
      if (historyFuture.length === 0) return;

      const nextState = historyFuture[0];
      const newFuture = historyFuture.slice(1);
      const newPast = pushToHistory(historyPast, components, wires);

      set({
        components: nextState.components,
        wires: nextState.wires,
        historyPast: newPast,
        historyFuture: newFuture,
        selectedComponentId: null,
      });
      get().runSimulation();
    },

    rotateComponent: (id) => {
      const {components, wires, historyPast} = get();
      const updated = components.map((c) =>
        c.id === id ? {...c, rotation: ((c.rotation || 0) + 90) % 360} : c
      );

      set({
        historyPast: pushToHistory(historyPast, components, wires),
        historyFuture: [],
        components: updated,
      });
      get().runSimulation();
    },

    toggleRuler: () => set((state) => ({showRuler: !state.showRuler})),
    toggleProtractor: () => set((state) => ({showProtractor: !state.showProtractor})),
    setRulerPos: (rulerPos) => set({rulerPos}),
    setProtractorPos: (protractorPos) => set({protractorPos}),

    setEyepieceOpen: (isEyepieceOpen) => set({isEyepieceOpen}),
    updateEyepieceSettings: (partial) =>
      set((state) => ({
        eyepieceSettings: {...state.eyepieceSettings, ...partial},
      })),
    setActiveJournalTab: (activeJournalTab) => set({activeJournalTab}),

    addComponent: (type, posX, posY) => {
      const {activeLab, components, wires, historyPast} = get();
      const compDef = activeLab.components.find((c) => c.type === type);
      if (!compDef) return;

      const initialValues: Record<string, number> = {};
      compDef.properties.forEach((prop) => {
        initialValues[prop.key] = prop.defaultValue;
      });

      const newComponent: CircuitComponent = {
        id: `comp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type,
        x: posX ?? 220 + (components.length % 4) * 120,
        y: posY ?? 180 + Math.floor(components.length / 4) * 100,
        rotation: 0,
        values: initialValues,
        state:
          type === 'switch'
            ? {isOpen: false}
            : type === 'slide_sample'
              ? {sampleType: 'onion', stainType: 'lugol'}
              : {},
      };

      const updated = [...components, newComponent];
      set({
        historyPast: pushToHistory(historyPast, components, wires),
        historyFuture: [],
        components: updated,
        selectedComponentId: newComponent.id,
      });
      get().runSimulation();
    },

    removeComponent: (id) => {
      const {components, wires, selectedComponentId, historyPast} = get();
      const updatedComponents = components.filter((c) => c.id !== id);
      const updatedWires = wires.filter(
        (w) => w.from.componentId !== id && w.to.componentId !== id
      );

      set({
        historyPast: pushToHistory(historyPast, components, wires),
        historyFuture: [],
        components: updatedComponents,
        wires: updatedWires,
        selectedComponentId: selectedComponentId === id ? null : selectedComponentId,
      });
      get().runSimulation();
    },

    updateComponentPosition: (id, x, y) => {
      const {components} = get();
      set({
        components: components.map((c) => (c.id === id ? {...c, x, y} : c)),
      });
    },

    updateComponentsPhysics: (updates) => {
      const {components} = get();
      if (updates.length === 0) return;
      const map = new Map<string, {x: number; y: number; rotation?: number}>();
      updates.forEach((u) => map.set(u.id, u));
      set({
        components: components.map((c) => {
          const up = map.get(c.id);
          if (!up) return c;
          return {
            ...c,
            x: up.x,
            y: up.y,
            rotation: up.rotation !== undefined ? up.rotation : c.rotation,
          };
        }),
      });
    },

    updateComponentValue: (id, key, value) => {
      const {components} = get();
      set({
        components: components.map((c) =>
          c.id === id ? {...c, values: {...c.values, [key]: value}} : c
        ),
      });
      get().runSimulation();
    },

    toggleSwitch: (id) => {
      const {components, wires, historyPast} = get();
      const updated = components.map((c) =>
        c.id === id
          ? {
              ...c,
              state: {...c.state, isOpen: !c.state.isOpen},
            }
          : c
      );

      set({
        historyPast: pushToHistory(historyPast, components, wires),
        historyFuture: [],
        components: updated,
      });
      get().runSimulation();
    },

    selectComponent: (id) => set({selectedComponentId: id}),

    startConnectingTerminal: (ref) => {
      set({activeConnectingTerminal: ref});
    },

    finishConnectingTerminal: (targetRef) => {
      const {activeConnectingTerminal, wires, components, historyPast} = get();
      if (!activeConnectingTerminal) return;

      // Нельзя соединять терминал сам с собой
      if (
        activeConnectingTerminal.componentId === targetRef.componentId &&
        activeConnectingTerminal.terminalId === targetRef.terminalId
      ) {
        set({activeConnectingTerminal: null});
        return;
      }

      // Проверяем, существует ли уже такой провод
      const exists = wires.some(
        (w) =>
          (w.from.componentId === activeConnectingTerminal.componentId &&
            w.from.terminalId === activeConnectingTerminal.terminalId &&
            w.to.componentId === targetRef.componentId &&
            w.to.terminalId === targetRef.terminalId) ||
          (w.from.componentId === targetRef.componentId &&
            w.from.terminalId === targetRef.terminalId &&
            w.to.componentId === activeConnectingTerminal.componentId &&
            w.to.terminalId === activeConnectingTerminal.terminalId)
      );

      if (!exists) {
        const newWire: Wire = {
          id: `wire_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          from: activeConnectingTerminal,
          to: targetRef,
        };
        const updatedWires = [...wires, newWire];
        set({
          historyPast: pushToHistory(historyPast, components, wires),
          historyFuture: [],
          wires: updatedWires,
          activeConnectingTerminal: null,
        });
        get().runSimulation();
      } else {
        set({activeConnectingTerminal: null});
      }
    },

    cancelConnecting: () => set({activeConnectingTerminal: null}),

    removeWire: (wireId) => {
      const {wires, components, historyPast} = get();
      const updatedWires = wires.filter((w) => w.id !== wireId);
      set({
        historyPast: pushToHistory(historyPast, components, wires),
        historyFuture: [],
        wires: updatedWires,
      });
      get().runSimulation();
    },

    clearWorkbench: () => {
      const {components, wires, historyPast} = get();
      set({
        historyPast: pushToHistory(historyPast, components, wires),
        historyFuture: [],
        components: [],
        wires: [],
        selectedComponentId: null,
        activeConnectingTerminal: null,
        simulationResult: null,
        circuitPhysics: null,
        stepValidationMessage: null,
      });
      get().generateOscilloscopeTrace();
    },

    loadPreset: () => {
      const {activeLab, components, wires, historyPast} = get();
      const defaultComps = activeLab.defaultState?.components
        ? JSON.parse(JSON.stringify(activeLab.defaultState.components))
        : [];
      const defaultWires = activeLab.defaultState?.wires
        ? JSON.parse(JSON.stringify(activeLab.defaultState.wires))
        : [];

      set({
        historyPast: pushToHistory(historyPast, components, wires),
        historyFuture: [],
        components: defaultComps,
        wires: defaultWires,
        selectedComponentId: null,
        activeConnectingTerminal: null,
        stepValidationMessage: null,
      });
      get().runSimulation();
    },

    applySynthesizedCircuit: (circuit: SynthesizedCircuit) => {
      const {components, wires, historyPast, activeLabId} = get();
      if (activeLabId !== 'circuits-dc') {
        const targetLab = LabRegistry.get('circuits-dc');
        if (targetLab) {
          set({activeLabId: 'circuits-dc', activeLab: targetLab});
        }
      }

      const newComponents = JSON.parse(JSON.stringify(circuit.components));
      const newWires = JSON.parse(JSON.stringify(circuit.wires));

      set({
        historyPast: pushToHistory(historyPast, components, wires),
        historyFuture: [],
        components: newComponents,
        wires: newWires,
        currentView: 'lab',
        selectedComponentId: null,
        activeConnectingTerminal: null,
        stepValidationMessage: null,
      });
      get().runSimulation();
    },

    runSimulation: () => {
      const {activeLab, components, wires, selectedComponentId, activeConnectingTerminal} = get();
      const labState: LabState = {
        labId: activeLab.id,
        components,
        wires,
        selectedComponentId,
        activeConnectingTerminal,
        simulationResult: null,
        lastSimulatedAt: Date.now(),
      };

      const result = activeLab.simulate(labState);
      const physics = calculateConnectedComponentPhysics(components, wires);

      // Синхронизируем показания измерительных приборов и яркость ламп
      const updatedComponents = components.map((comp) => {
        const compPhys = physics.components[comp.id];
        if (!compPhys) return comp;
        if (comp.type === 'ammeter' || comp.type === 'voltmeter' || comp.type === 'multimeter') {
          return {
            ...comp,
            state: {
              ...comp.state,
              reading: comp.type === 'ammeter' ? compPhys.current : compPhys.voltageDrop,
            },
          };
        }
        if (comp.type === 'lamp') {
          return {
            ...comp,
            state: {
              ...comp.state,
              illuminated: compPhys.isConducting && !comp.state?.isBlown,
              brightness: Math.min(1, compPhys.current / 0.6),
            },
          };
        }
        return comp;
      });

      set({
        simulationResult: result,
        circuitPhysics: physics,
        components: updatedComponents,
      });
      get().generateOscilloscopeTrace();
    },

    calculateCircuitPhysics: () => {
      const {components, wires} = get();
      const physics = calculateConnectedComponentPhysics(components, wires);
      set({circuitPhysics: physics});
      return physics;
    },

    setUnitSystemMode: (unitSystemMode) => set({unitSystemMode}),

    toggleUnitSystemMode: () =>
      set((state) => ({
        unitSystemMode:
          state.unitSystemMode === 'auto'
            ? 'si-base'
            : state.unitSystemMode === 'si-base'
              ? 'engineering'
              : 'auto',
      })),

    convertUnit: (value, fromUnit, toUnit, quantity) =>
      convertUnitUtil(value, fromUnit, toUnit, quantity),

    autoConvertUnit: (value, quantity, options) => {
      const currentMode = options?.mode || get().unitSystemMode;
      return autoConvertPhysicalValue(value, quantity, {...options, mode: currentMode});
    },

    generateOscilloscopeTrace: () => {
      const {simulationResult} = get();
      const isClosed = simulationResult?.isClosedCircuit ?? false;
      const current = isClosed ? simulationResult?.totalCurrent || 0 : 0;
      const trace: OscilloscopeDataPoint[] = [];

      for (let i = 0; i <= 60; i++) {
        const tVal = i * 0.05;
        const ripple = isClosed ? Math.sin(tVal * 10) * 0.03 * current : 0;
        const noise = isClosed ? (Math.random() - 0.5) * 0.015 * current : 0;
        const voltage = isClosed ? Math.max(0, 9 - current * 1.5 + Math.sin(tVal * 8) * 0.08) : 0;
        trace.push({
          t: tVal,
          current: Math.max(0, current + ripple + noise),
          voltage,
        });
      }

      set({oscilloscopeData: trace});
    },

    selectLesson: (lessonId) => {
      set({
        activeLessonId: lessonId,
        activeStepIndex: 0,
        stepValidationMessage: null,
      });
    },

    checkLessonStep: () => {
      const {activeLab, activeLessonId, activeStepIndex, components, wires, language} = get();
      const lesson = activeLab.lessons.find((l) => l.id === activeLessonId);
      if (!lesson || !lesson.steps[activeStepIndex]) return false;

      const currentStep = lesson.steps[activeStepIndex];
      const currentState: LabState = {
        labId: activeLab.id,
        language,
        components,
        wires,
        selectedComponentId: null,
        activeConnectingTerminal: null,
        simulationResult: get().simulationResult,
        lastSimulatedAt: Date.now(),
      };

      const validation = currentStep.validate(currentState);
      const feedback = t(validation.feedbackKey, language, validation.feedbackParams);
      set({stepValidationMessage: feedback});

      return validation.passed;
    },

    nextLessonStep: () => {
      const {activeLab, activeLessonId, activeStepIndex} = get();
      const lesson = activeLab.lessons.find((l) => l.id === activeLessonId);
      if (!lesson) return;

      if (activeStepIndex < lesson.steps.length - 1) {
        set({
          activeStepIndex: activeStepIndex + 1,
          stepValidationMessage: null,
        });
      }
    },

    sendTutorMessage: async (
      userText?: string,
      actionType: 'chat' | 'hint' | 'check_circuit' = 'chat'
    ) => {
      const {
        activeLab,
        components,
        wires,
        simulationResult,
        language,
        pedagogyMode,
        tutorMessages,
        activeLessonId,
      } = get();

      const promptMessage =
        userText && userText.trim().length > 0
          ? userText.trim()
          : actionType === 'check_circuit'
            ? language === 'tg'
              ? 'Лутфан, схемаи маро санҷед'
              : 'Проверь мою схему'
            : language === 'tg'
              ? 'Ба ман маслиҳат диҳед'
              : 'Дай мне подсказку';

      const userMsg: TutorMessage = {
        id: `usr_${Date.now()}`,
        sender: 'user',
        text: promptMessage,
        timestamp: Date.now(),
        language,
      };

      const tutorPlaceholderId = `tut_${Date.now()}`;
      const placeholderReply: TutorMessage = {
        id: tutorPlaceholderId,
        sender: 'tutor',
        text: '',
        timestamp: Date.now(),
        language,
        pedagogyMode,
      };

      set({
        tutorMessages: [...tutorMessages, userMsg, placeholderReply],
        isTutorLoading: true,
      });

      const currentState: LabState = {
        labId: activeLab.id,
        components,
        wires,
        selectedComponentId: null,
        activeConnectingTerminal: null,
        simulationResult,
        lastSimulatedAt: Date.now(),
      };

      const stateSnapshot = activeLab.describeState(currentState);

      try {
        const response = await fetch('/api/tutor', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            message: promptMessage,
            actionType,
            state: stateSnapshot,
            language,
            lessonId: activeLessonId,
            history: tutorMessages.slice(-6).map((m) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`Server returned ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';
        let buffer = '';

        while (true) {
          const {done, value} = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, {stream: true});
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const block of lines) {
            const line = block.trim();
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr === '[DONE]') {
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  set((state) => ({
                    tutorMessages: state.tutorMessages.map((msg) =>
                      msg.id === tutorPlaceholderId ? {...msg, text: accumulatedText} : msg
                    ),
                  }));
                }
              } catch (_) {
                // Ignore chunk parse error
              }
            }
          }
        }

        const {cleanText, circuit} = extractCircuitFromText(accumulatedText);
        let finalCircuit = circuit;
        if (!finalCircuit) {
          const intent = detectCircuitSynthesisIntent(promptMessage);
          if (intent) {
            finalCircuit = synthesizeCircuitByKey(intent, language);
          }
        }

        // Автоматически выкладываем синтезированную схему на верстак (2D и 3D)
        if (finalCircuit) {
          get().applySynthesizedCircuit(finalCircuit);
        }

        set((state) => ({
          tutorMessages: state.tutorMessages.map((msg) =>
            msg.id === tutorPlaceholderId
              ? {
                  ...msg,
                  text: cleanText || accumulatedText,
                  synthesizedCircuit: finalCircuit || undefined,
                }
              : msg
          ),
          isTutorLoading: false,
        }));
      } catch (err) {
        console.warn('[useLabStore] Error connecting to /api/tutor, using offline fallback hints:', err);

        let fallbackText = '';
        const offline = offlineHints as Record<string, Record<string, string>>;

        if (actionType === 'check_circuit') {
          if (stateSnapshot.activeComponentsCount === 0) {
            fallbackText = offline.EMPTY_CIRCUIT[language];
          } else if (stateSnapshot.hasHazard) {
            fallbackText = offline.SHORT_CIRCUIT[language];
          } else if (!stateSnapshot.isCircuitComplete) {
            fallbackText = offline.OPEN_CIRCUIT[language];
          } else {
            fallbackText = offline.CIRCUIT_OK[language];
          }
        } else if (actionType === 'hint') {
          if (stateSnapshot.activeComponentsCount === 0) {
            fallbackText = offline.HINT_BATTERY_LAMP[language];
          } else if (stateSnapshot.hasHazard) {
            fallbackText = offline.SHORT_CIRCUIT[language];
          } else if (!stateSnapshot.isCircuitComplete) {
            fallbackText = offline.OPEN_CIRCUIT[language];
          } else {
            fallbackText = offline.CIRCUIT_OK[language];
          }
        } else {
          if (stateSnapshot.hasHazard) {
            fallbackText = offline.SHORT_CIRCUIT[language];
          } else if (!stateSnapshot.isCircuitComplete) {
            fallbackText = offline.OPEN_CIRCUIT[language];
          } else {
            fallbackText = offline.CIRCUIT_OK[language];
          }
        }

        const synthIntent = detectCircuitSynthesisIntent(promptMessage);
        let synthCircuit: SynthesizedCircuit | null = null;
        let synthReply = '';

        if (synthIntent) {
          synthCircuit = synthesizeCircuitByKey(synthIntent, language);
          // Автоматически выкладываем схему на верстак
          get().applySynthesizedCircuit(synthCircuit);
          synthReply =
            language === 'tg'
              ? `Ман ҳамчун ИИ-Омӯзгор ва Созанда схемаи дархостшударо («${synthCircuit.title}») таҳлил ва ба таври худкор ба мизи кории 2D ва 3D гузоштам!\n${synthCircuit.description}\n\nҲамаи ${synthCircuit.components.length} унсур васл ва ҷараён ҳисоб карда шуд.`
              : `Я как ИИ-Наставник и Создатель спроектировал и автоматически выложил схему «${synthCircuit.title}» на ваш 2D и 3D верстак!\n${synthCircuit.description}\n\nВсе ${synthCircuit.components.length} компонентов и ${synthCircuit.wires.length} проводов соединены, цепь смоделирована и готова к опытам!`;
        }

        set((state) => ({
          tutorMessages: state.tutorMessages.map((msg) =>
            msg.id === tutorPlaceholderId
              ? {
                  ...msg,
                  text: synthReply || fallbackText,
                  synthesizedCircuit: synthCircuit || undefined,
                }
              : msg
          ),
          isTutorLoading: false,
        }));
      }
    },

    requestTutorHint: async () => {
      await get().sendTutorMessage('', 'hint');
    },

    checkMyCircuit: async () => {
      await get().sendTutorMessage('', 'check_circuit');
    },
  };
});
