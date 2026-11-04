/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Deterministic Physics Solver for Notebook Problems
 * Centre of Mass (1D & 2D) and Resistance / Ohm's Law Calculations
 * Meta Global AI Developer Hackathon (Indie Developer Track: "Build for Your World")
 */

import {CentreOfMassProblem, ResistanceProblem} from '../schema/notebook.ts';

export interface SocraticTutorSteps {
  hint: string;
  steps: string[];
  finalAnswer: string;
}

export interface CentreOfMassSolution {
  totalMass: number;
  xCom: number;
  yCom: number;
  xComFraction: string;
  yComFraction: string;
  formattedCoordinates: string;
  tutor: {
    tg: SocraticTutorSteps;
    ru: SocraticTutorSteps;
    en: SocraticTutorSteps;
  };
}

export interface ResistanceSolution {
  equivalentResistance: number;
  current?: number;
  voltage?: number;
  tutor: {
    tg: SocraticTutorSteps;
    ru: SocraticTutorSteps;
    en: SocraticTutorSteps;
  };
}

function gcd(a: number, b: number): number {
  let x = Math.round(Math.abs(a));
  let y = Math.round(Math.abs(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function formatFraction(numerator: number, denominator: number, variable?: string): string {
  if (denominator === 0) return '0';
  const isNeg = (numerator < 0) !== (denominator < 0);
  const num = Math.abs(Math.round(numerator * 1000));
  const den = Math.abs(Math.round(denominator * 1000));
  const g = gcd(num, den);
  const sn = num / g;
  const sd = den / g;

  const sign = isNeg ? '-' : '';

  if (sd === 1) {
    if (variable) {
      return sn === 1 ? `${sign}${variable}` : `${sign}${sn}${variable}`;
    }
    return `${sign}${sn}`;
  }

  if (variable) {
    const top = sn === 1 ? `${sign}${variable}` : `${sign}${sn}${variable}`;
    return `${top}/${sd}`;
  }

  return `${sign}${sn}/${sd}`;
}

/**
 * Deterministically solves the Centre of Mass for a system of point masses in 1D or 2D.
 * Formula:
 * M = \sum m_i
 * X_{com} = \frac{\sum m_i x_i}{M}
 * Y_{com} = \frac{\sum m_i y_i}{M}
 */
export function solveCentreOfMass(problem: CentreOfMassProblem): CentreOfMassSolution {
  const items = problem.items || [];
  if (items.length === 0) {
    throw new Error('At least one mass is required to compute centre of mass.');
  }

  const totalMass = items.reduce((acc, it) => acc + it.mass, 0);
  if (totalMass <= 0) {
    throw new Error('Total mass of the system must be greater than zero.');
  }

  const sumMx = items.reduce((acc, it) => acc + it.mass * it.x, 0);
  const sumMy = items.reduce((acc, it) => acc + it.mass * (it.y ?? 0), 0);

  const xCom = sumMx / totalMass;
  const yCom = sumMy / totalMass;

  const vSym = problem.variableSymbol?.trim() || undefined;

  const xComFraction = formatFraction(sumMx, totalMass, vSym);
  const yComFraction = formatFraction(sumMy, totalMass, vSym);

  const is2D = problem.dimension === '2D';
  const formattedCoordinates = is2D
    ? `(${xComFraction}, ${yComFraction})`
    : xComFraction;

  // Build Socratic pedagogical steps for all 3 languages:
  const massTermsStr = items.map((it) => (it.mass === 1 ? 'm' : `${it.mass}m`)).join(' + ');
  const xMomentsStr = items
    .map((it) => {
      const mStr = it.mass === 1 ? 'm' : `${it.mass}m`;
      const xStr = vSym && it.x !== 0 ? (it.x === 1 ? vSym : `${it.x}${vSym}`) : `${it.x}`;
      return `(${mStr} · ${xStr})`;
    })
    .join(' + ');

  const yMomentsStr = items
    .map((it) => {
      const mStr = it.mass === 1 ? 'm' : `${it.mass}m`;
      const yVal = it.y ?? 0;
      const yStr = vSym && yVal !== 0 ? (yVal === 1 ? vSym : `${yVal}${vSym}`) : `${yVal}`;
      return `(${mStr} · ${yStr})`;
    })
    .join(' + ');

  // Tajik tutor explanation
  const tg: SocraticTutorSteps = {
    hint: 'Маркази массаҳо (COM) мавқеи миёнавазни ҳамаи зарраҳо мебошад. Формулаи асосӣ: x_com = Σ(m_i · x_i) / Σm_i. Аввал массаи умумиро ҳисоб кунед.',
    steps: [
      `1. Массаи умумии система (M_умумӣ): ${massTermsStr} = ${totalMass}m.`,
      `2. Лаҳзаи статикӣ қад-қади меҳвари X: Σ(m_i · x_i) = ${xMomentsStr} = ${sumMx}${vSym ? vSym + 'm' : 'm'}.`,
      `3. Ҳисоби координатаи x_com: ${sumMx}${vSym ? vSym : ''} / ${totalMass} = ${xComFraction}.`,
      ...(is2D
        ? [
            `4. Лаҳзаи статикӣ қад-қади меҳвари Y: Σ(m_i · y_i) = ${yMomentsStr} = ${sumMy}${vSym ? vSym + 'm' : 'm'}.`,
            `5. Ҳисоби координатаи y_com: ${sumMy}${vSym ? vSym : ''} / ${totalMass} = ${yComFraction}.`,
          ]
        : []),
    ],
    finalAnswer: `Маркази массаҳои система: ${formattedCoordinates}`,
  };

  // Russian tutor explanation
  const ru: SocraticTutorSteps = {
    hint: 'Центр масс (COM) — это средневзвешенное положение всех точечных масс. Основная формула: x_com = Σ(m_i · x_i) / Σm_i. Начните с нахождения общей массы системы.',
    steps: [
      `1. Суммарная масса системы (M_общ): ${massTermsStr} = ${totalMass}m.`,
      `2. Статический момент по оси X: Σ(m_i · x_i) = ${xMomentsStr} = ${sumMx}${vSym ? vSym + 'm' : 'm'}.`,
      `3. Координата центра масс x_com: ${sumMx}${vSym ? vSym : ''} / ${totalMass} = ${xComFraction}.`,
      ...(is2D
        ? [
            `4. Статический момент по оси Y: Σ(m_i · y_i) = ${yMomentsStr} = ${sumMy}${vSym ? vSym + 'm' : 'm'}.`,
            `5. Координата центра масс y_com: ${sumMy}${vSym ? vSym : ''} / ${totalMass} = ${yComFraction}.`,
          ]
        : []),
    ],
    finalAnswer: `Координаты центра масс: ${formattedCoordinates}`,
  };

  // English tutor explanation
  const en: SocraticTutorSteps = {
    hint: 'The center of mass (COM) is the mass-weighted average position of the system. Fundamental formula: x_com = Σ(m_i · x_i) / Σm_i. First find the total mass.',
    steps: [
      `1. Total mass of the system (M_total): ${massTermsStr} = ${totalMass}m.`,
      `2. First moment along the X-axis: Σ(m_i · x_i) = ${xMomentsStr} = ${sumMx}${vSym ? vSym + 'm' : 'm'}.`,
      `3. X-coordinate of COM: ${sumMx}${vSym ? vSym : ''} / ${totalMass} = ${xComFraction}.`,
      ...(is2D
        ? [
            `4. First moment along the Y-axis: Σ(m_i · y_i) = ${yMomentsStr} = ${sumMy}${vSym ? vSym + 'm' : 'm'}.`,
            `5. Y-coordinate of COM: ${sumMy}${vSym ? vSym : ''} / ${totalMass} = ${yComFraction}.`,
          ]
        : []),
    ],
    finalAnswer: `Center of mass coordinates: ${formattedCoordinates}`,
  };

  return {
    totalMass,
    xCom,
    yCom,
    xComFraction,
    yComFraction,
    formattedCoordinates,
    tutor: {tg, ru, en},
  };
}

/**
 * Deterministically solves series/parallel equivalent resistance and Ohm's law.
 */
export function solveResistanceProblem(problem: ResistanceProblem): ResistanceSolution {
  const {topology, resistors, voltage} = problem;

  if (resistors.length === 0) {
    throw new Error('At least one resistor is required.');
  }

  let req = 0;
  if (topology === 'series') {
    req = resistors.reduce((sum, r) => sum + r.resistance, 0);
  } else if (topology === 'parallel') {
    const invSum = resistors.reduce((sum, r) => sum + 1 / r.resistance, 0);
    req = invSum > 0 ? 1 / invSum : 0;
  } else {
    // mixed: default to first resistor in series with remaining in parallel if length >= 2
    if (resistors.length === 1) {
      req = resistors[0].resistance;
    } else {
      const r1 = resistors[0].resistance;
      const others = resistors.slice(1);
      const invSum = others.reduce((sum, r) => sum + 1 / r.resistance, 0);
      const parallelPart = invSum > 0 ? 1 / invSum : 0;
      req = r1 + parallelPart;
    }
  }

  req = Number(req.toFixed(2));
  const current = voltage !== undefined && req > 0 ? Number((voltage / req).toFixed(3)) : undefined;

  const rListStr = resistors.map((r) => `${r.resistance}Ω`).join(topology === 'series' ? ' + ' : ' || ');

  const tg: SocraticTutorSteps = {
    hint: topology === 'series'
      ? 'Дар пайвасти пайдарпай муқовимати умумӣ бо ҷамъи оддии муқовиматҳо баробар аст: R_умумӣ = R1 + R2 + ...'
      : 'Дар пайвасти мутавозӣ бузургии баръакси муқовимати умумӣ баробари ҷамъи бузургиҳои баръакс аст: 1/R_умумӣ = 1/R1 + 1/R2 + ...',
    steps: [
      `1. Муқовимати баробарқимат (R_экв): ${rListStr} = ${req} Ω.`,
      ...(voltage !== undefined && current !== undefined
        ? [
            `2. Шиддати манбаъ (U): ${voltage} В.`,
            `3. Қонуни Ом (I = U / R): I = ${voltage} / ${req} = ${current} А.`,
          ]
        : []),
    ],
    finalAnswer: `Муқовимати умумӣ: ${req} Ω${current !== undefined ? `, Ҷараён: ${current} A` : ''}`,
  };

  const ru: SocraticTutorSteps = {
    hint: topology === 'series'
      ? 'При последовательном соединении сопротивления складываются: R_экв = R1 + R2 + ...'
      : 'При параллельном соединении складываются обратные величины (проводимости): 1/R_экв = 1/R1 + 1/R2 + ...',
    steps: [
      `1. Эквивалентное сопротивление: ${rListStr} = ${req} Ом.`,
      ...(voltage !== undefined && current !== undefined
        ? [
            `2. Напряжение источника (U): ${voltage} В.`,
            `3. Закон Ома (I = U / R): I = ${voltage} / ${req} = ${current} А.`,
          ]
        : []),
    ],
    finalAnswer: `Эквивалентное сопротивление: ${req} Ом${current !== undefined ? `, Ток: ${current} А` : ''}`,
  };

  const en: SocraticTutorSteps = {
    hint: topology === 'series'
      ? 'In series connection, resistances add directly: R_eq = R1 + R2 + ...'
      : 'In parallel connection, reciprocals add: 1/R_eq = 1/R1 + 1/R2 + ...',
    steps: [
      `1. Equivalent resistance: ${rListStr} = ${req} Ω.`,
      ...(voltage !== undefined && current !== undefined
        ? [
            `2. Source voltage (V): ${voltage} V.`,
            `3. Ohm's Law (I = V / R): I = ${voltage} / ${req} = ${current} A.`,
          ]
        : []),
    ],
    finalAnswer: `Equivalent resistance: ${req} Ω${current !== undefined ? `, Current: ${current} A` : ''}`,
  };

  return {
    equivalentResistance: req,
    current,
    voltage,
    tutor: {tg, ru, en},
  };
}
