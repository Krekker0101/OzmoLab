/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Общие контракты и типы данных платформы
 */

export type SupportedLanguage = 'tg' | 'ru' | 'en';
export type AppTheme = 'light' | 'dark';

export interface UserProfile {
  name: string;
  role: 'student' | 'teacher';
  city: string;
  school: string;
  grade: number;
  xp: number;
  completedLabsCount: number;
  badges: string[];
}

export type ComponentCategory = 'sources' | 'loads' | 'switches' | 'meters' | 'optics' | 'biology';

export interface ComponentTerminal {
  id: string; // e.g. "positive", "negative", "terminal_a", "terminal_b"
  nameKey: string;
  relativeX: number; // relative coordinate inside component viewBox (0..100)
  relativeY: number; // relative coordinate inside component viewBox (0..100)
}

export interface ComponentPropertyDefinition {
  key: string;
  nameKey: string;
  unit: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

export interface ComponentDefinition {
  type: string;
  nameKey: string;
  category: ComponentCategory;
  iconName: string;
  terminals: ComponentTerminal[];
  properties: ComponentPropertyDefinition[];
  descriptionKey: string;
}

export interface CircuitComponent {
  id: string;
  type: string; // matches ComponentDefinition.type, e.g. "battery", "resistor", "lamp", "switch", "ammeter", "voltmeter", "rheostat", "capacitor", "diode", "multimeter"
  x: number;
  y: number;
  rotation: number; // in degrees (0, 90, 180, 270)
  values: Record<string, number>; // e.g. { voltage: 9, resistance: 10, internalResistance: 0.1 }
  state: {
    isOpen?: boolean; // for switches
    isBlown?: boolean; // for lamps / fuses
    illuminated?: boolean;
    brightness?: number; // 0..1
    reading?: number; // for meters
    charge?: number; // for capacitors (Coulombs)
    isConducting?: boolean; // for diodes
    sampleType?: string; // for slide_sample (onion, animal_epithelium, bacteria, blood, paramecium)
    stainType?: string; // for slide_sample (lugol, methylene, none)
  };
}

export interface OscilloscopeDataPoint {
  t: number;
  current: number;
  voltage: number;
}

export interface TerminalRef {
  componentId: string;
  terminalId: string;
}

export interface Wire {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
  current?: number; // calculated branch current in Amperes
  voltageDrop?: number;
  isOverheated?: boolean;
}

export interface SimulationResult {
  isClosedCircuit: boolean;
  hasShortCircuit: boolean;
  totalCurrent: number; // in Amperes
  totalEquivalentResistance: number; // in Ohms
  componentStates: Record<
    string,
    {
      current: number; // Amperes
      voltageDrop: number; // Volts
      power: number; // Watts
      status: 'normal' | 'overload' | 'open' | 'active';
    }
  >;
  warnings: Array<{
    code: 'SHORT_CIRCUIT' | 'OPEN_CIRCUIT' | 'HIGH_CURRENT' | 'VOLTAGE_OVERLOAD';
    messageKey: string;
    params?: Record<string, string | number>;
  }>;
}

export interface LabState {
  labId: string;
  components: CircuitComponent[];
  wires: Wire[];
  selectedComponentId: string | null;
  activeConnectingTerminal: TerminalRef | null;
  simulationResult: SimulationResult | null;
  lastSimulatedAt: number | null;
  metadata?: Record<string, unknown>;
}

export type PedagogyMode = 'socratic' | 'direct' | 'combined';

export interface SynthesizedCircuit {
  id: string;
  title: string;
  description: string;
  discipline: string;
  components: CircuitComponent[];
  wires: Wire[];
}

export interface TutorMessage {
  id: string;
  sender: 'user' | 'tutor' | 'system';
  text: string;
  timestamp: number;
  language: SupportedLanguage;
  pedagogyMode?: PedagogyMode;
  suggestedActions?: Array<{
    id: string;
    labelKey: string;
    actionType: 'inspect' | 'fix' | 'measure' | 'step_next';
    payload?: Record<string, unknown>;
  }>;
  synthesizedCircuit?: SynthesizedCircuit;
}

export interface StepValidationResult {
  passed: boolean;
  feedbackKey: string;
  feedbackParams?: Record<string, string | number>;
}

export interface LessonStep {
  id: string;
  stepNumber: number;
  titleKey: string;
  instructionKey: string;
  hintKey: string;
  initialComponents?: CircuitComponent[];
  initialWires?: Wire[];
  validate: (state: LabState) => StepValidationResult;
}

export interface Lesson {
  id: string;
  titleKey: string;
  descriptionKey: string;
  gradeLevel: number; // 7, 8, 9, 10, 11
  difficulty: 'easy' | 'medium' | 'advanced';
  steps: LessonStep[];
}

export interface AISummarySnapshot {
  labId: string;
  summaryText: string;
  isCircuitComplete: boolean;
  hasHazard: boolean;
  activeComponentsCount: number;
  components: Array<{
    id: string;
    type: string;
    parameters: Record<string, number>;
    measuredCurrent?: number;
    measuredVoltage?: number;
    stateText: string;
  }>;
  connectionsCount: number;
  currentLessonStepId?: string;
}

export type {
  LabModule,
  LabDiscipline,
  LabMetadata,
  LabModuleConfig,
  PhysicsSimulationHook,
  AISummaryHook,
} from './types/lab.ts';
export {createLabModule, defineLabModule} from './types/lab.ts';

export interface GlossaryTerm {
  id: string;
  term_ru: string;
  term_tg: string;
  term_en: string;
  definition_ru: string;
  definition_tg: string;
  definition_en: string;
  symbol: string;
  unit: string;
  verified: boolean;
  category: string;
}
