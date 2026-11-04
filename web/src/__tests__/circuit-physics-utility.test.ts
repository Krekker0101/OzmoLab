/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Unit Tests for Circuit Physics Utility
 */

import {describe, it, expect} from 'vitest';
import {
  calculateConnectedComponentPhysics,
  formatVoltage,
  formatResistance,
  formatCurrent,
  formatPower,
} from '../store/circuitPhysicsUtility.ts';
import {CircuitComponent, Wire} from '../../../shared/types.ts';

describe('Circuit Physics Utility (calculateConnectedComponentPhysics)', () => {
  it('returns empty circuit summary when no components are present', () => {
    const physics = calculateConnectedComponentPhysics([], []);
    expect(physics.circuitStatus).toBe('empty');
    expect(physics.isClosedCircuit).toBe(false);
    expect(physics.totalVoltage).toBe(0);
    expect(physics.totalCurrent).toBe(0);
    expect(physics.connectedComponentsCount).toBe(0);
  });

  it('correctly calculates voltage, resistance, and current for a closed series circuit', () => {
    const components: CircuitComponent[] = [
      {
        id: 'bat_1',
        type: 'battery',
        x: 100,
        y: 100,
        rotation: 0,
        values: {voltage: 9.0, internalResistance: 0.2},
        state: {},
      },
      {
        id: 'res_1',
        type: 'resistor',
        x: 300,
        y: 100,
        rotation: 0,
        values: {resistance: 10.0},
        state: {},
      },
    ];

    const wires: Wire[] = [
      {
        id: 'wire_1',
        from: {componentId: 'bat_1', terminalId: 'pos'},
        to: {componentId: 'res_1', terminalId: 'term_a'},
      },
      {
        id: 'wire_2',
        from: {componentId: 'res_1', terminalId: 'term_b'},
        to: {componentId: 'bat_1', terminalId: 'neg'},
      },
    ];

    const physics = calculateConnectedComponentPhysics(components, wires);

    expect(physics.isClosedCircuit).toBe(true);
    expect(physics.hasShortCircuit).toBe(false);
    expect(physics.circuitStatus).toBe('closed');
    expect(physics.totalVoltage).toBe(9.0);

    // Total resistance R_total = 10 + 0.2 = 10.2 Ω
    // Total current I = 9 / 10.2 ≈ 0.8824 A
    expect(physics.equivalentResistance).toBeCloseTo(10.2, 1);
    expect(physics.totalCurrent).toBeCloseTo(0.882, 2);
    expect(physics.ohmsLaw.isConsistent).toBe(true);

    // Check component-specific voltage drop and resistance
    const resPhys = physics.components['res_1'];
    expect(resPhys).toBeDefined();
    expect(resPhys.isConnected).toBe(true);
    expect(resPhys.isFullyConnected).toBe(true);
    expect(resPhys.isConducting).toBe(true);
    expect(resPhys.resistance).toBeCloseTo(10.0, 1);
    expect(resPhys.voltageDrop).toBeCloseTo(8.82, 1);
    expect(resPhys.current).toBeCloseTo(0.882, 2);
  });

  it('detects open circuit when a wire or switch is disconnected', () => {
    const components: CircuitComponent[] = [
      {
        id: 'bat_1',
        type: 'battery',
        x: 100,
        y: 100,
        rotation: 0,
        values: {voltage: 9.0, internalResistance: 0.2},
        state: {},
      },
      {
        id: 'res_1',
        type: 'resistor',
        x: 300,
        y: 100,
        rotation: 0,
        values: {resistance: 10.0},
        state: {},
      },
    ];

    // Only one wire connected: circuit is open
    const wires: Wire[] = [
      {
        id: 'wire_1',
        from: {componentId: 'bat_1', terminalId: 'pos'},
        to: {componentId: 'res_1', terminalId: 'term_a'},
      },
    ];

    const physics = calculateConnectedComponentPhysics(components, wires);

    expect(physics.isClosedCircuit).toBe(false);
    expect(physics.circuitStatus).toBe('open');
    expect(physics.totalCurrent).toBe(0);

    const resPhys = physics.components['res_1'];
    expect(resPhys.isConnected).toBe(true);
    expect(resPhys.isFullyConnected).toBe(false);
    expect(resPhys.isConducting).toBe(false);
  });

  it('identifies and warns on direct short circuit', () => {
    const components: CircuitComponent[] = [
      {
        id: 'bat_1',
        type: 'battery',
        x: 100,
        y: 100,
        rotation: 0,
        values: {voltage: 9.0, internalResistance: 0.2},
        state: {},
      },
    ];

    // Direct wire connecting pos to neg
    const wires: Wire[] = [
      {
        id: 'short_wire',
        from: {componentId: 'bat_1', terminalId: 'pos'},
        to: {componentId: 'bat_1', terminalId: 'neg'},
      },
    ];

    const physics = calculateConnectedComponentPhysics(components, wires);

    expect(physics.hasShortCircuit).toBe(true);
    expect(physics.circuitStatus).toBe('short_circuit');
    expect(physics.warnings.some((w) => w.code === 'SHORT_CIRCUIT')).toBe(true);
  });

  it('calculates voltage drop and through-current across ammeters and voltmeters', () => {
    const components: CircuitComponent[] = [
      {
        id: 'bat_1',
        type: 'battery',
        x: 50,
        y: 100,
        rotation: 0,
        values: {voltage: 12.0, internalResistance: 0.1},
        state: {},
      },
      {
        id: 'ammeter_1',
        type: 'ammeter',
        x: 200,
        y: 100,
        rotation: 0,
        values: {internalResistance: 0.01},
        state: {},
      },
      {
        id: 'lamp_1',
        type: 'lamp',
        x: 350,
        y: 100,
        rotation: 0,
        values: {resistance: 24.0},
        state: {},
      },
    ];

    const wires: Wire[] = [
      {
        id: 'w1',
        from: {componentId: 'bat_1', terminalId: 'pos'},
        to: {componentId: 'ammeter_1', terminalId: 'term_a'},
      },
      {
        id: 'w2',
        from: {componentId: 'ammeter_1', terminalId: 'term_b'},
        to: {componentId: 'lamp_1', terminalId: 'term_a'},
      },
      {
        id: 'w3',
        from: {componentId: 'lamp_1', terminalId: 'term_b'},
        to: {componentId: 'bat_1', terminalId: 'neg'},
      },
    ];

    const physics = calculateConnectedComponentPhysics(components, wires);

    expect(physics.isClosedCircuit).toBe(true);
    // Total resistance R = 0.1 + 0.01 + 24 = 24.11 Ω
    // Current I = 12 / 24.11 ≈ 0.4977 A
    expect(physics.totalCurrent).toBeCloseTo(0.498, 2);

    const ammeterPhys = physics.components['ammeter_1'];
    expect(ammeterPhys).toBeDefined();
    expect(ammeterPhys.current).toBeCloseTo(0.498, 2);
    expect(ammeterPhys.voltageDrop).toBeLessThan(0.05);

    const lampPhys = physics.components['lamp_1'];
    expect(lampPhys).toBeDefined();
    expect(lampPhys.voltageDrop).toBeCloseTo(11.95, 1);
    expect(lampPhys.power).toBeGreaterThan(5.0);
  });

  it('formats physical quantities cleanly with proper SI units', () => {
    expect(formatVoltage(0)).toBe('0.00 V');
    expect(formatVoltage(12.456)).toBe('12.46 V');
    expect(formatVoltage(0.025)).toBe('25.0 mV');
    expect(formatVoltage(1500)).toBe('1.50 kV');

    expect(formatResistance(0)).toBe('0.00 Ω');
    expect(formatResistance(10.5)).toBe('10.50 Ω');
    expect(formatResistance(2200)).toBe('2.20 kΩ');
    expect(formatResistance(1500000)).toBe('1.50 MΩ');

    expect(formatCurrent(0)).toBe('0.00 A');
    expect(formatCurrent(0.8824)).toBe('0.882 A');
    expect(formatCurrent(0.005)).toBe('5.0 mA');

    expect(formatPower(0)).toBe('0.00 W');
    expect(formatPower(7.94)).toBe('7.94 W');
    expect(formatPower(1200)).toBe('1.20 kW');
  });
});
