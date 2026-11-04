/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Утилита контекстной конвертации физических единиц
 * Автоматически масштабирует и переводит физические величины (Омы в кОм, Амперы в мА и т.д.)
 * для вывода в журнал наблюдений, карточки компонентов и телеметрию.
 */

export type PhysicalQuantity =
  | 'resistance'
  | 'voltage'
  | 'current'
  | 'power'
  | 'capacitance'
  | 'frequency'
  | 'length';

export type UnitSystemMode = 'auto' | 'si-base' | 'engineering';

export interface UnitScaleDefinition {
  symbol: string;
  factor: number; // Factor relative to base SI unit (e.g., 1000 for kΩ relative to Ω)
  nameKey: string;
  prefix: string;
  multiplierText: string;
}

export interface ConvertedValue {
  originalValue: number;
  baseUnit: string;
  targetValue: number;
  targetUnit: string;
  formatted: string; // e.g. "1.50 kΩ"
  baseFormatted: string; // e.g. "1500.00 Ω"
  scientificFormatted: string; // e.g. "1.50 × 10³ Ω"
  scaleFactor: number;
  quantity: PhysicalQuantity;
  conversionExplanation: string; // e.g. "1 kΩ = 1,000 Ω"
}

export const QUANTITY_BASE_UNITS: Record<PhysicalQuantity, string> = {
  resistance: 'Ω',
  voltage: 'V',
  current: 'A',
  power: 'W',
  capacitance: 'F',
  frequency: 'Hz',
  length: 'm',
};

export const UNIT_SCALES: Record<PhysicalQuantity, UnitScaleDefinition[]> = {
  resistance: [
    {symbol: 'mΩ', factor: 1e-3, nameKey: 'unit.milliohm', prefix: 'm', multiplierText: '10⁻³ Ω'},
    {symbol: 'Ω', factor: 1, nameKey: 'unit.ohm', prefix: '', multiplierText: '1 Ω'},
    {symbol: 'kΩ', factor: 1e3, nameKey: 'unit.kiloohm', prefix: 'k', multiplierText: '10³ Ω'},
    {symbol: 'MΩ', factor: 1e6, nameKey: 'unit.megaohm', prefix: 'M', multiplierText: '10⁶ Ω'},
    {symbol: 'GΩ', factor: 1e9, nameKey: 'unit.gigaohm', prefix: 'G', multiplierText: '10⁹ Ω'},
  ],
  voltage: [
    {symbol: 'µV', factor: 1e-6, nameKey: 'unit.microvolt', prefix: 'µ', multiplierText: '10⁻⁶ V'},
    {symbol: 'mV', factor: 1e-3, nameKey: 'unit.millivolt', prefix: 'm', multiplierText: '10⁻³ V'},
    {symbol: 'V', factor: 1, nameKey: 'unit.volt', prefix: '', multiplierText: '1 V'},
    {symbol: 'kV', factor: 1e3, nameKey: 'unit.kilovolt', prefix: 'k', multiplierText: '10³ V'},
    {symbol: 'MV', factor: 1e6, nameKey: 'unit.megavolt', prefix: 'M', multiplierText: '10⁶ V'},
  ],
  current: [
    {symbol: 'nA', factor: 1e-9, nameKey: 'unit.nanoampere', prefix: 'n', multiplierText: '10⁻⁹ A'},
    {symbol: 'µA', factor: 1e-6, nameKey: 'unit.microampere', prefix: 'µ', multiplierText: '10⁻⁶ A'},
    {symbol: 'mA', factor: 1e-3, nameKey: 'unit.milliampere', prefix: 'm', multiplierText: '10⁻³ A'},
    {symbol: 'A', factor: 1, nameKey: 'unit.ampere', prefix: '', multiplierText: '1 A'},
    {symbol: 'kA', factor: 1e3, nameKey: 'unit.kiloampere', prefix: 'k', multiplierText: '10³ A'},
  ],
  power: [
    {symbol: 'µW', factor: 1e-6, nameKey: 'unit.microwatt', prefix: 'µ', multiplierText: '10⁻⁶ W'},
    {symbol: 'mW', factor: 1e-3, nameKey: 'unit.milliwatt', prefix: 'm', multiplierText: '10⁻³ W'},
    {symbol: 'W', factor: 1, nameKey: 'unit.watt', prefix: '', multiplierText: '1 W'},
    {symbol: 'kW', factor: 1e3, nameKey: 'unit.kilowatt', prefix: 'k', multiplierText: '10³ W'},
    {symbol: 'MW', factor: 1e6, nameKey: 'unit.megawatt', prefix: 'M', multiplierText: '10⁶ W'},
  ],
  capacitance: [
    {symbol: 'pF', factor: 1e-12, nameKey: 'unit.picofarad', prefix: 'p', multiplierText: '10⁻¹² F'},
    {symbol: 'nF', factor: 1e-9, nameKey: 'unit.nanofarad', prefix: 'n', multiplierText: '10⁻⁹ F'},
    {symbol: 'µF', factor: 1e-6, nameKey: 'unit.microfarad', prefix: 'µ', multiplierText: '10⁻⁶ F'},
    {symbol: 'mF', factor: 1e-3, nameKey: 'unit.millifarad', prefix: 'm', multiplierText: '10⁻³ F'},
    {symbol: 'F', factor: 1, nameKey: 'unit.farad', prefix: '', multiplierText: '1 F'},
  ],
  frequency: [
    {symbol: 'Hz', factor: 1, nameKey: 'unit.hertz', prefix: '', multiplierText: '1 Hz'},
    {symbol: 'kHz', factor: 1e3, nameKey: 'unit.kilohertz', prefix: 'k', multiplierText: '10³ Hz'},
    {symbol: 'MHz', factor: 1e6, nameKey: 'unit.megahertz', prefix: 'M', multiplierText: '10⁶ Hz'},
    {symbol: 'GHz', factor: 1e9, nameKey: 'unit.gigahertz', prefix: 'G', multiplierText: '10⁹ Hz'},
  ],
  length: [
    {symbol: 'nm', factor: 1e-9, nameKey: 'unit.nanometer', prefix: 'n', multiplierText: '10⁻⁹ m'},
    {symbol: 'µm', factor: 1e-6, nameKey: 'unit.micrometer', prefix: 'µ', multiplierText: '10⁻⁶ m'},
    {symbol: 'mm', factor: 1e-3, nameKey: 'unit.millimeter', prefix: 'm', multiplierText: '10⁻³ m'},
    {symbol: 'cm', factor: 1e-2, nameKey: 'unit.centimeter', prefix: 'c', multiplierText: '10⁻² m'},
    {symbol: 'm', factor: 1, nameKey: 'unit.meter', prefix: '', multiplierText: '1 m'},
    {symbol: 'km', factor: 1e3, nameKey: 'unit.kilometer', prefix: 'k', multiplierText: '10³ m'},
  ],
};

/**
 * Определяет физическую величину по единице измерения
 */
export function detectQuantityFromUnit(unit: string): PhysicalQuantity | null {
  for (const [quantity, scales] of Object.entries(UNIT_SCALES) as Array<[PhysicalQuantity, UnitScaleDefinition[]]>) {
    if (scales.some((s) => s.symbol === unit)) {
      return quantity;
    }
  }
  for (const [quantity, scales] of Object.entries(UNIT_SCALES) as Array<[PhysicalQuantity, UnitScaleDefinition[]]>) {
    if (scales.some((s) => s.symbol.toLowerCase() === unit.toLowerCase())) {
      return quantity;
    }
  }
  return null;
}

/**
 * Конвертирует числовое значение между двумя единицами измерения одной величины
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  explicitQuantity?: PhysicalQuantity
): number {
  if (fromUnit === toUnit) return value;
  const quantity = explicitQuantity || detectQuantityFromUnit(fromUnit) || detectQuantityFromUnit(toUnit);
  if (!quantity) return value;

  const scales = UNIT_SCALES[quantity];
  const fromScale = scales.find((s) => s.symbol === fromUnit) || scales.find((s) => s.symbol.toLowerCase() === fromUnit.toLowerCase());
  const toScale = scales.find((s) => s.symbol === toUnit) || scales.find((s) => s.symbol.toLowerCase() === toUnit.toLowerCase());

  if (!fromScale || !toScale) return value;

  // value in base SI = value * fromScale.factor
  // value in target = (value in base SI) / toScale.factor
  const valueInBase = value * fromScale.factor;
  return valueInBase / toScale.factor;
}

/**
 * Выбирает наиболее читабельный инженерный масштаб для физической величины
 */
export function getOptimalUnitScale(value: number, quantity: PhysicalQuantity): UnitScaleDefinition {
  const scales = UNIT_SCALES[quantity];
  const baseScale = scales.find((s) => s.factor === 1) || scales[0];

  const absVal = Math.abs(value);
  if (absVal === 0 || !Number.isFinite(absVal)) {
    return baseScale;
  }

  // Для сопротивления: если >= 1e6 -> MΩ, >= 1e3 -> kΩ, < 0.1 -> mΩ
  // Для тока: если < 0.001 -> µA, < 0.1 -> mA, >= 1000 -> kA
  // Ищем наибольшую шкалу, при которой значение >= 0.95 (или наименьшую при очень малых значениях)
  const sorted = [...scales].sort((a, b) => b.factor - a.factor);

  for (const scale of sorted) {
    if (absVal >= scale.factor * 0.95) {
      return scale;
    }
  }

  // Если значение меньше самого низкого множителя, возвращаем минимальный доступный
  return sorted[sorted.length - 1];
}

/**
 * Формирует строку научной экспоненциальной нотации (например: "1.50 × 10³ Ω")
 */
export function toScientificNotation(value: number, unit: string, precision: number = 2): string {
  if (value === 0 || !Number.isFinite(value)) return `0.00 ${unit}`;
  const abs = Math.abs(value);
  const exponent = Math.floor(Math.log10(abs));
  const mantissa = value / Math.pow(10, exponent);

  const superscripts: Record<string, string> = {
    '-': '⁻',
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
  };
  const expStr = String(exponent)
    .split('')
    .map((c) => superscripts[c] || c)
    .join('');

  return `${mantissa.toFixed(precision)} × 10${expStr} ${unit}`;
}

/**
 * Основная функция автоконвертации: масштабирует базовое значение физической величины
 * в зависимости от контекста и режима отображения.
 */
export function autoConvertPhysicalValue(
  baseValue: number,
  quantity: PhysicalQuantity,
  options?: {
    mode?: UnitSystemMode;
    targetUnit?: string;
    precision?: number;
  }
): ConvertedValue {
  const mode = options?.mode || 'auto';
  const scales = UNIT_SCALES[quantity];
  const baseScale = scales.find((s) => s.factor === 1) || scales[0];
  const baseUnit = baseScale.symbol;

  let chosenScale: UnitScaleDefinition;

  if (options?.targetUnit) {
    const explicit =
      scales.find((s) => s.symbol === options.targetUnit) ||
      scales.find((s) => s.symbol.toLowerCase() === options.targetUnit?.toLowerCase());
    chosenScale = explicit || baseScale;
  } else if (mode === 'si-base') {
    chosenScale = baseScale;
  } else {
    chosenScale = getOptimalUnitScale(baseValue, quantity);
  }

  const targetValue = baseValue / chosenScale.factor;
  const precision = options?.precision !== undefined ? options.precision : 2;

  // Форматирование целевого значения
  let formattedTargetNum: string;
  const absTarget = Math.abs(targetValue);
  if (absTarget === 0) {
    formattedTargetNum = '0.00';
  } else if (absTarget < 0.01) {
    formattedTargetNum = targetValue.toFixed(precision + 1);
  } else if (absTarget >= 100) {
    formattedTargetNum = targetValue.toFixed(1);
  } else {
    formattedTargetNum = targetValue.toFixed(precision);
  }

  const formatted = `${formattedTargetNum} ${chosenScale.symbol}`;
  const baseFormatted = `${baseValue.toFixed(precision)} ${baseUnit}`;
  const scientificFormatted = toScientificNotation(baseValue, baseUnit, precision);

  let explanation: string;
  if (chosenScale.factor === 1) {
    explanation = `1 ${baseUnit} = 1 ${baseUnit}`;
  } else if (chosenScale.factor > 1) {
    explanation = `1 ${chosenScale.symbol} = ${chosenScale.factor.toLocaleString('en-US')} ${baseUnit}`;
  } else {
    explanation = `1 ${chosenScale.symbol} = ${chosenScale.factor} ${baseUnit}`;
  }

  return {
    originalValue: baseValue,
    baseUnit,
    targetValue,
    targetUnit: chosenScale.symbol,
    formatted,
    baseFormatted,
    scientificFormatted,
    scaleFactor: chosenScale.factor,
    quantity,
    conversionExplanation: explanation,
  };
}
