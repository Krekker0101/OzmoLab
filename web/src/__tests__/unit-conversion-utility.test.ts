/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Unit Tests for Unit Conversion Utility & Lab Store Integration
 */

import {describe, it, expect, beforeEach} from 'vitest';
import {
  convertUnit,
  detectQuantityFromUnit,
  getOptimalUnitScale,
  toScientificNotation,
  autoConvertPhysicalValue,
  UNIT_SCALES,
  QUANTITY_BASE_UNITS,
} from '../store/unitConversionUtility.ts';
import {useLabStore} from '../store/useLabStore.ts';

describe('Unit Conversion Utility (unitConversionUtility)', () => {
  describe('detectQuantityFromUnit', () => {
    it('detects correct physical quantity for various unit symbols', () => {
      expect(detectQuantityFromUnit('Ω')).toBe('resistance');
      expect(detectQuantityFromUnit('kΩ')).toBe('resistance');
      expect(detectQuantityFromUnit('MΩ')).toBe('resistance');
      expect(detectQuantityFromUnit('V')).toBe('voltage');
      expect(detectQuantityFromUnit('mV')).toBe('voltage');
      expect(detectQuantityFromUnit('kV')).toBe('voltage');
      expect(detectQuantityFromUnit('A')).toBe('current');
      expect(detectQuantityFromUnit('mA')).toBe('current');
      expect(detectQuantityFromUnit('µA')).toBe('current');
      expect(detectQuantityFromUnit('W')).toBe('power');
      expect(detectQuantityFromUnit('mW')).toBe('power');
      expect(detectQuantityFromUnit('µF')).toBe('capacitance');
      expect(detectQuantityFromUnit('kHz')).toBe('frequency');
      expect(detectQuantityFromUnit('mm')).toBe('length');
    });

    it('returns null for unknown units', () => {
      expect(detectQuantityFromUnit('unknown_unit')).toBeNull();
    });
  });

  describe('convertUnit', () => {
    it('converts resistance values between Ω, kΩ, and MΩ', () => {
      // 1000 Ω -> 1 kΩ
      expect(convertUnit(1000, 'Ω', 'kΩ')).toBeCloseTo(1, 5);
      // 2.5 kΩ -> 2500 Ω
      expect(convertUnit(2.5, 'kΩ', 'Ω')).toBeCloseTo(2500, 5);
      // 0.5 MΩ -> 500 kΩ
      expect(convertUnit(0.5, 'MΩ', 'kΩ')).toBeCloseTo(500, 5);
      // 100 mΩ -> 0.1 Ω
      expect(convertUnit(100, 'mΩ', 'Ω')).toBeCloseTo(0.1, 5);
    });

    it('converts current values between A, mA, and µA', () => {
      // 0.05 A -> 50 mA
      expect(convertUnit(0.05, 'A', 'mA')).toBeCloseTo(50, 5);
      // 25 mA -> 0.025 A
      expect(convertUnit(25, 'mA', 'A')).toBeCloseTo(0.025, 5);
      // 500 µA -> 0.5 mA
      expect(convertUnit(500, 'µA', 'mA')).toBeCloseTo(0.5, 5);
      // 0.002 A -> 2000 µA
      expect(convertUnit(0.002, 'A', 'µA')).toBeCloseTo(2000, 5);
    });

    it('converts voltage values between V, mV, and kV', () => {
      // 12 V -> 12000 mV
      expect(convertUnit(12, 'V', 'mV')).toBeCloseTo(12000, 5);
      // 450 mV -> 0.45 V
      expect(convertUnit(450, 'mV', 'V')).toBeCloseTo(0.45, 5);
      // 3.3 kV -> 3300 V
      expect(convertUnit(3.3, 'kV', 'V')).toBeCloseTo(3300, 5);
    });

    it('converts power values between W, mW, and kW', () => {
      // 2.5 W -> 2500 mW
      expect(convertUnit(2.5, 'W', 'mW')).toBeCloseTo(2500, 5);
      // 1500 W -> 1.5 kW
      expect(convertUnit(1500, 'W', 'kW')).toBeCloseTo(1.5, 5);
    });

    it('returns the same value when source and target units match', () => {
      expect(convertUnit(42, 'kΩ', 'kΩ')).toBe(42);
      expect(convertUnit(0.15, 'mA', 'mA')).toBe(0.15);
    });
  });

  describe('getOptimalUnitScale', () => {
    it('picks kΩ for 1500 Ω and MΩ for 2,200,000 Ω', () => {
      const scale1500 = getOptimalUnitScale(1500, 'resistance');
      expect(scale1500.symbol).toBe('kΩ');

      const scaleMega = getOptimalUnitScale(2.2e6, 'resistance');
      expect(scaleMega.symbol).toBe('MΩ');
    });

    it('picks mA for 0.025 A and µA for 0.00005 A', () => {
      const scaleMilli = getOptimalUnitScale(0.025, 'current');
      expect(scaleMilli.symbol).toBe('mA');

      const scaleMicro = getOptimalUnitScale(0.00005, 'current');
      expect(scaleMicro.symbol).toBe('µA');
    });

    it('defaults to base SI unit for zero or near-zero inputs', () => {
      const scaleZero = getOptimalUnitScale(0, 'voltage');
      expect(scaleZero.symbol).toBe('V');
      expect(scaleZero.factor).toBe(1);
    });
  });

  describe('toScientificNotation', () => {
    it('formats values in scientific exponential notation with unicode superscripts', () => {
      const formattedOhm = toScientificNotation(1500, 'Ω', 2);
      expect(formattedOhm).toBe('1.50 × 10³ Ω');

      const formattedCurrent = toScientificNotation(0.005, 'A', 2);
      expect(formattedCurrent).toBe('5.00 × 10⁻³ A');

      const formattedZero = toScientificNotation(0, 'V', 2);
      expect(formattedZero).toBe('0.00 V');
    });
  });

  describe('autoConvertPhysicalValue', () => {
    it('scales 4700 Ω to 4.70 kΩ in auto mode', () => {
      const result = autoConvertPhysicalValue(4700, 'resistance', {mode: 'auto'});
      expect(result.targetUnit).toBe('kΩ');
      expect(result.targetValue).toBeCloseTo(4.7, 3);
      expect(result.formatted).toContain('4.7');
      expect(result.formatted).toContain('kΩ');
      expect(result.baseFormatted).toContain('4700');
      expect(result.baseFormatted).toContain('Ω');
      expect(result.scaleFactor).toBe(1000);
      expect(result.conversionExplanation).toContain('1 kΩ = 1,000 Ω');
    });

    it('preserves base unit in si-base mode', () => {
      const result = autoConvertPhysicalValue(4700, 'resistance', {mode: 'si-base'});
      expect(result.targetUnit).toBe('Ω');
      expect(result.targetValue).toBe(4700);
      expect(result.formatted).toContain('4700');
      expect(result.formatted).toContain('Ω');
    });

    it('allows explicit targetUnit override', () => {
      const result = autoConvertPhysicalValue(500000, 'resistance', {targetUnit: 'kΩ'});
      expect(result.targetUnit).toBe('kΩ');
      expect(result.targetValue).toBeCloseTo(500, 3);
      expect(result.formatted).toContain('500');
      expect(result.formatted).toContain('kΩ');
    });

    it('handles small currents (e.g. 0.015 A -> 15 mA)', () => {
      const result = autoConvertPhysicalValue(0.015, 'current', {mode: 'auto'});
      expect(result.targetUnit).toBe('mA');
      expect(result.targetValue).toBeCloseTo(15, 3);
      expect(result.formatted).toBe('15.00 mA');
    });
  });

  describe('Lab Store Integration (useLabStore)', () => {
    beforeEach(() => {
      useLabStore.getState().setUnitSystemMode('auto');
    });

    it('initializes with auto unitSystemMode', () => {
      expect(useLabStore.getState().unitSystemMode).toBe('auto');
    });

    it('changes unitSystemMode via setUnitSystemMode', () => {
      useLabStore.getState().setUnitSystemMode('si-base');
      expect(useLabStore.getState().unitSystemMode).toBe('si-base');

      useLabStore.getState().setUnitSystemMode('engineering');
      expect(useLabStore.getState().unitSystemMode).toBe('engineering');
    });

    it('cycles unitSystemMode via toggleUnitSystemMode', () => {
      expect(useLabStore.getState().unitSystemMode).toBe('auto');

      useLabStore.getState().toggleUnitSystemMode();
      expect(useLabStore.getState().unitSystemMode).toBe('si-base');

      useLabStore.getState().toggleUnitSystemMode();
      expect(useLabStore.getState().unitSystemMode).toBe('engineering');

      useLabStore.getState().toggleUnitSystemMode();
      expect(useLabStore.getState().unitSystemMode).toBe('auto');
    });

    it('calls autoConvertUnit from store instance', () => {
      const converted = useLabStore.getState().autoConvertUnit(2200, 'resistance');
      expect(converted.targetUnit).toBe('kΩ');
      expect(converted.targetValue).toBeCloseTo(2.2, 3);
      expect(converted.baseUnit).toBe('Ω');
    });

    it('calls convertUnit from store instance', () => {
      const val = useLabStore.getState().convertUnit(15, 'mA', 'A');
      expect(val).toBeCloseTo(0.015, 5);
    });
  });
});
