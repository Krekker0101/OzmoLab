/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Типы данных и конфигурации тем для Hero 3D-сцены
 */

export type BenchMode = 'circuit' | 'optics' | 'biology' | 'reactions' | 'mechanisms';
export type MultimeterMode = 'V' | 'A' | 'R';
export type QualityLevel = 'auto' | 'high' | 'low';

export type InstrumentType =
  | 'multimeter'
  | 'power_supply'
  | 'ph_meter'
  | 'thermometer'
  | 'dynamometer'
  | 'tachometer';

export interface ActiveInstrument {
  id: string;
  type: InstrumentType;
  name: string;
  primaryValue: string;
  secondaryValue: string;
  unit: string;
  status: 'active' | 'standby' | 'alert';
  positionIndex: number;
}

export interface CircuitState {
  isClosed: boolean;
  rheostatR: number; // 10..100 Ohm
  batteryV: number; // 9.0 V
  lampBaseR: number; // 10.0 Ohm
  multimeterMode: MultimeterMode;
  current: number; // Amperes
  lampVoltage: number; // Volts
  lampPower: number; // Watts
  isOverloaded: boolean;
}

export interface OpticsState {
  laserAngle: number; // 15..60 deg
  lensIndex: number; // 1.33..1.80 (e.g. 1.52 Crown Glass)
  opticType: 'prism' | 'lens';
  refractAngle: number;
}

export interface BiologyState {
  magnification: number; // 40..1000
  focus: number; // 0..1
  stain: 'lugol' | 'methylene' | 'none';
  sampleType: 'onion' | 'blood' | 'elodea' | 'paramecium';
}

export interface ReactionState {
  reactionType: 'titration' | 'precipitation' | 'electrolysis';
  titrantAddedMl: number; // 0..50 mL
  acidMolarity: number; // mol/L
  baseMolarity: number; // mol/L
  initialVolumeMl: number; // mL
  stirrerSpeedRpm: number; // 0..1200
  isStirrerOn: boolean;
  currentElectrolysisA: number; // 0..3 A
  elapsedSec: number;
  // Calculated state
  ph: number;
  liquidColor: string;
  temperatureC: number;
  precipitateGrams: number;
  gasH2Ml: number;
  gasO2Ml: number;
  isEquivalenceReached: boolean;
  isBoiling: boolean;
}

export interface MechanismState {
  mechanismType: 'gears' | 'pulley' | 'slider_crank';
  isMotorOn: boolean;
  motorRpm: number; // -300..+300
  inputTorqueNm: number; // N*m
  gear1Teeth: number; // e.g. 18
  gear2Teeth: number; // e.g. 24
  gear3Teeth: number; // e.g. 36
  pulleySheaves: 1 | 2 | 4; // Mechanical advantage
  loadMassKg: number; // 1..50 kg
  crankRadiusCm: number; // e.g. 6 cm
  connectingRodCm: number; // e.g. 18 cm
  // Calculated state
  gearRatio: number;
  outputRpm: number;
  outputTorqueNm: number;
  powerWatts: number;
  pulleyTensionN: number;
  pulleyLiftCm: number;
  crankAngleDeg: number;
  sliderDisplacementCm: number;
  sliderVelocityCmS: number;
  efficiency: number;
}

export interface InteractiveHitObject {
  id:
    | 'switch'
    | 'rheostat_slider'
    | 'multimeter'
    | 'laser'
    | 'lamp'
    | 'burette_valve'
    | 'stirrer_knob'
    | 'gear_driver'
    | 'pulley_rope'
    | 'crank_wheel'
    | 'instrument_bench';
  title: string;
  hint: string;
}

export interface Theme3DConfig {
  backgroundGradient: [string, string]; // [top, bottom] CSS gradient for canvas backdrop
  tableColor: number; // Hex color
  tableRoughness: number;
  tableMetalness: number;
  envIntensity: number;
  exposure: number;
  bloomThreshold: number;
  bloomIntensity: number;
  bloomRadius: number;
  keyLightIntensity: number;
  keyLightColor: number;
  hemiIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  rimIntensity: number;
  rimColor: number;
  shadowOpacity: number;
  gridLineColor: string;
  gridSubLineColor: string;
  gridBgColor: string;
  gridTextColor: string;
  borderCol: number;
  switchBaseCol: number;
  socketBaseCol: number;
  screenBoardCol: number;
  contactShadowColor: string;
}

export const THEME_PRESETS: {light: Theme3DConfig; dark: Theme3DConfig} = {
  light: {
    backgroundGradient: ['#eef3fa', '#d9e4f2'],
    tableColor: 0xc2cedc, // Светло-серо-голубой (#c2cedc) - благородная керамика, не белое пятно
    tableRoughness: 0.65,
    tableMetalness: 0.04,
    envIntensity: 0.45, // Умеренный HDRI чтобы не заливать стол
    exposure: 0.82, // Контролируемая экспозиция ACESFilmic
    bloomThreshold: 0.94, // Блум ТОЛЬКО для яркой нити лампы (>1), стол не блумит
    bloomIntensity: 0.22,
    bloomRadius: 0.35,
    keyLightIntensity: 1.35, // Мягкий направленный свет
    keyLightColor: 0xfffaf0,
    hemiIntensity: 0.35,
    hemiSkyColor: 0x93c5fd,
    hemiGroundColor: 0xb8c7d9,
    rimIntensity: 1.25, // Синий контурный свет для четкого силуэта
    rimColor: 0x2563eb,
    shadowOpacity: 0.55,
    gridLineColor: 'rgba(30, 48, 80, 0.25)',
    gridSubLineColor: 'rgba(51, 65, 85, 0.12)',
    gridBgColor: '#c2cedc',
    gridTextColor: 'rgba(30, 48, 80, 0.5)',
    borderCol: 0x64748b,
    switchBaseCol: 0x94a3b8,
    socketBaseCol: 0xb0bec5,
    screenBoardCol: 0xd5deea,
    contactShadowColor: 'rgba(24, 38, 64, 0.55)',
  },
  dark: {
    backgroundGradient: ['#0b0f19', '#030712'],
    tableColor: 0x0d131f,
    tableRoughness: 0.45,
    tableMetalness: 0.12,
    envIntensity: 0.75,
    exposure: 1.05,
    bloomThreshold: 0.82,
    bloomIntensity: 0.5,
    bloomRadius: 0.45,
    keyLightIntensity: 2.2,
    keyLightColor: 0xfff7ed,
    hemiIntensity: 0.85,
    hemiSkyColor: 0x38bdf8,
    hemiGroundColor: 0x090d16,
    rimIntensity: 1.5,
    rimColor: 0x60a5fa,
    shadowOpacity: 0.65,
    gridLineColor: 'rgba(56, 189, 248, 0.25)',
    gridSubLineColor: 'rgba(30, 41, 59, 0.7)',
    gridBgColor: '#090d16',
    gridTextColor: 'rgba(56, 189, 248, 0.4)',
    borderCol: 0x1e293b,
    switchBaseCol: 0x1e293b,
    socketBaseCol: 0x1e293b,
    screenBoardCol: 0x0f172a,
    contactShadowColor: 'rgba(0, 0, 0, 0.7)',
  },
};
