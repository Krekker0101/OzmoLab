/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Точный научный физико-химический движок для 3D лаборатории
 * Реализует строгие уравнения термодинамики, стехиометрии, электролиза и теоретической механики.
 */

import {
  ActiveInstrument,
  CircuitState,
  InstrumentType,
  MechanismState,
  OpticsState,
  ReactionState,
} from './types.ts';

// Константы фундаментальной физики и химии
export const FARADAY_CONSTANT = 96485.332; // Кл/моль (C/mol)
export const GAS_CONSTANT = 8.314462; // Дж/(моль·К)
export const WATER_HEAT_CAPACITY = 4.184; // Дж/(г·К)
export const WATER_DENSITY = 1.0; // г/см³
export const NEUTRALIZATION_ENTHALPY = -57100; // Дж/моль (H+ + OH- -> H2O)
export const SILVER_CHLORIDE_KSP = 1.77e-10; // Произведение растворимости AgCl
export const AGCL_MOLAR_MASS = 143.32; // г/моль
export const MOLAR_GAS_VOLUME_RTP = 24465; // см³/моль (мл/моль при 298.15 К и 1 атм)
export const STANDARD_GRAVITY = 9.80665; // м/с²

/**
 * Расчет физико-химического состояния химической реакции
 */
export function calculateReactionPhysics(
  params: Omit<
    ReactionState,
    | 'ph'
    | 'liquidColor'
    | 'temperatureC'
    | 'precipitateGrams'
    | 'gasH2Ml'
    | 'gasO2Ml'
    | 'isEquivalenceReached'
    | 'isBoiling'
  >
): ReactionState {
  const {
    reactionType,
    titrantAddedMl,
    acidMolarity,
    baseMolarity,
    initialVolumeMl,
    currentElectrolysisA,
    elapsedSec,
  } = params;

  if (reactionType === 'titration') {
    const totalVolumeMl = Math.max(1, initialVolumeMl + titrantAddedMl);
    const molesAcid = acidMolarity * (initialVolumeMl / 1000);
    const molesBase = baseMolarity * (titrantAddedMl / 1000);

    let ph: number;
    let molesReacted: number;
    let isEquivalenceReached = false;

    const diffMoles = molesAcid - molesBase;
    const tolerance = 1e-7;

    if (Math.abs(diffMoles) < tolerance) {
      ph = 7.0;
      molesReacted = molesAcid;
      isEquivalenceReached = true;
    } else if (diffMoles > 0) {
      // Избыток сильной кислоты HCl
      const concH = diffMoles / (totalVolumeMl / 1000);
      ph = -Math.log10(Math.max(1e-14, concH));
      molesReacted = molesBase;
    } else {
      // Избыток сильного основания NaOH
      const concOH = -diffMoles / (totalVolumeMl / 1000);
      const pOH = -Math.log10(Math.max(1e-14, concOH));
      ph = 14.0 - pOH;
      molesReacted = molesAcid;
      isEquivalenceReached = true;
    }

    // Ограничение шкалы pH 0..14
    ph = Math.max(0.05, Math.min(13.95, ph));

    // Расчет экзотермического тепловыделения: Q = n * (-ΔH)
    const heatJoules = molesReacted * (-NEUTRALIZATION_ENTHALPY);
    const solutionMassGrams = totalVolumeMl * WATER_DENSITY;
    const deltaT = heatJoules / (solutionMassGrams * WATER_HEAT_CAPACITY);
    const temperatureC = 20.0 + deltaT;
    const isBoiling = temperatureC >= 100;

    // Цвет индикатора фенолфталеина:
    // pH < 8.2: бесцветный прозрачный (#f8fafc)
    // pH 8.2..10.0: плавный переход в малиновый
    // pH > 10.0: насыщенный ярко-малиновый (#be185d)
    let liquidColor = '#f8fafc';
    if (ph >= 8.2 && ph < 10.0) {
      const alpha = (ph - 8.2) / 1.8;
      // интерполяция между белым и малиновым
      const r = Math.round(248 + (219 - 248) * alpha);
      const g = Math.round(250 + (39 - 250) * alpha);
      const b = Math.round(252 + (119 - 252) * alpha);
      liquidColor = `rgb(${r}, ${g}, ${b})`;
    } else if (ph >= 10.0) {
      liquidColor = '#db2777';
    }

    return {
      ...params,
      ph,
      liquidColor,
      temperatureC,
      precipitateGrams: 0,
      gasH2Ml: 0,
      gasO2Ml: 0,
      isEquivalenceReached,
      isBoiling,
    };
  }

  if (reactionType === 'precipitation') {
    // AgNO3 + NaCl -> AgCl v + NaNO3
    const molesAg = 0.1 * (titrantAddedMl / 1000);
    const molesCl = 0.1 * (initialVolumeMl / 1000);
    const molesPrecipitate = Math.min(molesAg, molesCl);
    const precipitateGrams = molesPrecipitate * AGCL_MOLAR_MASS;

    // Помутнение раствора: белая суспензия осадка
    const opacity = Math.min(1, precipitateGrams / 0.35);
    const r = 255;
    const g = 255;
    const b = 255;
    const liquidColor = opacity > 0.05 ? `rgba(${r}, ${g}, ${b}, ${0.4 + opacity * 0.5})` : '#f8fafc';

    return {
      ...params,
      ph: 6.95,
      liquidColor,
      temperatureC: 20.4,
      precipitateGrams,
      gasH2Ml: 0,
      gasO2Ml: 0,
      isEquivalenceReached: molesAg >= molesCl,
      isBoiling: false,
    };
  }

  // electrolysis (2 H2O -> 2 H2 ^ + O2 ^)
  const current = Math.max(0, currentElectrolysisA);
  const time = Math.max(0, elapsedSec);
  const coulombs = current * time;

  // По закону Фарадея:
  // n(H2) = Q / (2 * F)
  // n(O2) = Q / (4 * F)
  const molesH2 = coulombs / (2 * FARADAY_CONSTANT);
  const molesO2 = coulombs / (4 * FARADAY_CONSTANT);

  const gasH2Ml = molesH2 * MOLAR_GAS_VOLUME_RTP;
  const gasO2Ml = molesO2 * MOLAR_GAS_VOLUME_RTP;

  // Джоулев нагрев электролита (Q = I^2 * R * t)
  const rElectrolyte = 4.5; // Ом
  const heatJ = current * current * rElectrolyte * time;
  const massG = initialVolumeMl * WATER_DENSITY;
  const deltaT = Math.min(60, heatJ / (massG * WATER_HEAT_CAPACITY));
  const temperatureC = 20.0 + deltaT;

  return {
    ...params,
    ph: 7.0,
    liquidColor: '#e0f2fe',
    temperatureC,
    precipitateGrams: 0,
    gasH2Ml,
    gasO2Ml,
    isEquivalenceReached: false,
    isBoiling: temperatureC >= 100,
  };
}

/**
 * Расчет теоретической механики и кинематики механизмов
 */
export function calculateMechanismPhysics(
  params: Omit<
    MechanismState,
    | 'gearRatio'
    | 'outputRpm'
    | 'outputTorqueNm'
    | 'powerWatts'
    | 'pulleyTensionN'
    | 'pulleyLiftCm'
    | 'crankAngleDeg'
    | 'sliderDisplacementCm'
    | 'sliderVelocityCmS'
    | 'efficiency'
  >,
  currentTimeSec: number = 0
): MechanismState {
  const {
    mechanismType,
    isMotorOn,
    motorRpm,
    inputTorqueNm,
    gear1Teeth,
    gear2Teeth,
    gear3Teeth,
    pulleySheaves,
    loadMassKg,
    crankRadiusCm,
    connectingRodCm,
  } = params;

  const effectiveRpm = isMotorOn ? motorRpm : 0;
  const omegaRadS = (effectiveRpm * 2 * Math.PI) / 60;

  if (mechanismType === 'gears') {
    // 3-ступенчатый редуктор со связующей паразитной шестерней
    const n1 = Math.max(6, gear1Teeth);
    const n2 = Math.max(6, gear2Teeth);
    const n3 = Math.max(6, gear3Teeth);

    // Передаточное отношение i = N3 / N1
    const gearRatio = n3 / n1;
    const efficiency = 0.95; // Два зацепления зубьев
    const outputRpm = effectiveRpm / gearRatio;
    const outputTorqueNm = inputTorqueNm * gearRatio * (isMotorOn ? efficiency : 0);
    const powerWatts = Math.abs(inputTorqueNm * omegaRadS);

    return {
      ...params,
      gearRatio,
      outputRpm,
      outputTorqueNm,
      powerWatts,
      pulleyTensionN: 0,
      pulleyLiftCm: 0,
      crankAngleDeg: 0,
      sliderDisplacementCm: 0,
      sliderVelocityCmS: 0,
      efficiency,
    };
  }

  if (mechanismType === 'pulley') {
    // Полиспаст: выигрыш в силе равен числу ветвей троса (1, 2, 4)
    const sheaves = pulleySheaves;
    const efficiency = sheaves === 1 ? 0.98 : sheaves === 2 ? 0.94 : 0.88;
    const loadForceN = loadMassKg * STANDARD_GRAVITY;
    const pulleyTensionN = loadForceN / (sheaves * efficiency);

    // Подъем груза при натяжении
    const liftCm = Math.min(45, (Math.sin(currentTimeSec * 1.5) + 1) * 15);
    const powerWatts = isMotorOn ? (loadForceN * (liftCm / 100)) / 2 : 0;

    return {
      ...params,
      gearRatio: sheaves,
      outputRpm: 0,
      outputTorqueNm: 0,
      powerWatts,
      pulleyTensionN,
      pulleyLiftCm: liftCm,
      crankAngleDeg: 0,
      sliderDisplacementCm: 0,
      sliderVelocityCmS: 0,
      efficiency,
    };
  }

  // slider_crank (Кривошипно-шатунный механизм)
  const rM = crankRadiusCm / 100;
  const lM = Math.max(rM * 1.5, connectingRodCm / 100);

  const crankAngleRad = (currentTimeSec * omegaRadS) % (2 * Math.PI);
  const crankAngleDeg = (crankAngleRad * 180) / Math.PI;

  // x(θ) = r*cos(θ) + sqrt(l^2 - r^2*sin^2(θ))
  const sinTheta = Math.sin(crankAngleRad);
  const cosTheta = Math.cos(crankAngleRad);
  const root = Math.sqrt(Math.max(0, lM * lM - rM * rM * sinTheta * sinTheta));
  const displacementM = rM * cosTheta + root;
  const sliderDisplacementCm = (displacementM - (lM - rM)) * 100;

  // Скорость v(θ) = -r*ω*(sin(θ) + (r*sin(2θ)) / (2*root))
  const sliderVelocityM_S = isMotorOn
    ? -rM * omegaRadS * (sinTheta + (rM * Math.sin(2 * crankAngleRad)) / (2 * root))
    : 0;

  const powerWatts = Math.abs(inputTorqueNm * omegaRadS);

  return {
    ...params,
    gearRatio: 1,
    outputRpm: effectiveRpm,
    outputTorqueNm: inputTorqueNm,
    powerWatts,
    pulleyTensionN: 0,
    pulleyLiftCm: 0,
    crankAngleDeg,
    sliderDisplacementCm,
    sliderVelocityCmS: sliderVelocityM_S * 100,
    efficiency: 0.92,
  };
}

/**
 * Расчет показаний измерительных приборов для отображения ученым и инженерам
 */
export function generateInstrumentTelemetry(
  type: InstrumentType,
  context: {
    circuit?: CircuitState;
    optics?: OpticsState;
    reaction?: ReactionState;
    mechanism?: MechanismState;
  }
): {primaryValue: string; secondaryValue: string; unit: string; status: 'active' | 'standby' | 'alert'} {
  switch (type) {
    case 'multimeter': {
      if (context.circuit) {
        const mode = context.circuit.multimeterMode;
        if (mode === 'V') {
          return {
            primaryValue: context.circuit.lampVoltage.toFixed(2),
            secondaryValue: 'DC True RMS',
            unit: 'V',
            status: context.circuit.isOverloaded ? 'alert' : 'active',
          };
        } else if (mode === 'A') {
          return {
            primaryValue: (context.circuit.current * 1000).toFixed(1),
            secondaryValue: 'Shunt 0.01Ω',
            unit: 'mA',
            status: context.circuit.isOverloaded ? 'alert' : 'active',
          };
        } else {
          return {
            primaryValue: context.circuit.rheostatR.toFixed(1),
            secondaryValue: '2-Wire Low-Ω',
            unit: 'Ω',
            status: 'active',
          };
        }
      }
      return {primaryValue: '0.00', secondaryValue: 'Standby', unit: 'V', status: 'standby'};
    }

    case 'power_supply': {
      const v = context.circuit ? context.circuit.batteryV : 12.0;
      const i = context.circuit ? context.circuit.current : 0;
      return {
        primaryValue: `${v.toFixed(2)} V`,
        secondaryValue: `${i.toFixed(3)} A`,
        unit: 'CV Mode',
        status: context.circuit?.isOverloaded ? 'alert' : 'active',
      };
    }

    case 'ph_meter': {
      if (context.reaction) {
        const ph = context.reaction.ph;
        const temp = context.reaction.temperatureC;
        return {
          primaryValue: ph.toFixed(2),
          secondaryValue: `${temp.toFixed(1)} °C ATC`,
          unit: 'pH',
          status: context.reaction.isEquivalenceReached ? 'alert' : 'active',
        };
      }
      return {primaryValue: '7.00', secondaryValue: '25.0 °C Calibrated', unit: 'pH', status: 'active'};
    }

    case 'thermometer': {
      const temp = context.reaction ? context.reaction.temperatureC : 22.4;
      return {
        primaryValue: temp.toFixed(1),
        secondaryValue: 'Pt100 Class A',
        unit: '°C',
        status: temp >= 90 ? 'alert' : 'active',
      };
    }

    case 'dynamometer': {
      if (context.mechanism) {
        if (context.mechanism.mechanismType === 'pulley') {
          return {
            primaryValue: context.mechanism.pulleyTensionN.toFixed(1),
            secondaryValue: `Load: ${context.mechanism.loadMassKg} kg`,
            unit: 'N',
            status: 'active',
          };
        } else {
          return {
            primaryValue: context.mechanism.outputTorqueNm.toFixed(2),
            secondaryValue: `Power: ${context.mechanism.powerWatts.toFixed(1)} W`,
            unit: 'N·m',
            status: 'active',
          };
        }
      }
      return {primaryValue: '0.00', secondaryValue: 'Zero Calibrated', unit: 'N', status: 'standby'};
    }

    case 'tachometer': {
      const rpm = context.mechanism ? context.mechanism.outputRpm : 0;
      const omega = context.mechanism ? (rpm * 2 * Math.PI) / 60 : 0;
      return {
        primaryValue: Math.abs(rpm).toFixed(0),
        secondaryValue: `${Math.abs(omega).toFixed(1)} rad/s`,
        unit: 'RPM',
        status: 'active',
      };
    }
  }
}
