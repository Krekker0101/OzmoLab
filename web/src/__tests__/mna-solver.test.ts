/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Photo-to-Circuit Lab Agent — Unit Tests for Deterministic MNA Circuit Solver
 */

import {describe, it, expect} from 'vitest';
import {solveCircuit} from '../../../shared/solver/mnaSolver.ts';
import {MNACircuit} from '../../../shared/solver/types.ts';

describe('Deterministic MNA DC Circuit Solver', () => {
  it("verifies Ohm's law with single battery and resistor", () => {
    // 9V Battery (internal R = 0.0), 10 Ohm Resistor
    // Expected: I = 9 / 10 = 0.9 A, V_resistor = 9.0 V
    const circuit: MNACircuit = {
      elements: [
        {id: 'bat1', type: 'battery', nodeA: 'n_pos', nodeB: 'n_gnd', value: 9.0, internalResistance: 0.0},
        {id: 'r1', type: 'resistor', nodeA: 'n_pos', nodeB: 'n_gnd', value: 10.0},
      ],
      groundNode: 'n_gnd',
    };

    const solution = solveCircuit(circuit);

    expect(solution.isClosedCircuit).toBe(true);
    expect(solution.hasShortCircuit).toBe(false);
    expect(solution.status).toBe('ok');

    // Node voltages
    expect(solution.nodeVoltages['n_pos']).toBeCloseTo(9.0, 3);
    expect(solution.nodeVoltages['n_gnd']).toBeCloseTo(0.0, 3);

    // Resistor values
    const r1 = solution.elementResults['r1'];
    expect(r1).toBeDefined();
    expect(r1.voltageDrop).toBeCloseTo(9.0, 3);
    expect(r1.current).toBeCloseTo(0.9, 3);
    expect(r1.power).toBeCloseTo(8.1, 3);

    // Battery values
    const bat1 = solution.elementResults['bat1'];
    expect(bat1.current).toBeCloseTo(0.9, 3);
    expect(solution.totalCurrent).toBeCloseTo(0.9, 3);
    expect(solution.totalEquivalentResistance).toBeCloseTo(10.0, 1);
  });

  it('verifies Series Circuit (Voltage Divider)', () => {
    // 12V Battery, R1 = 20 Ohm, R2 = 40 Ohm in series
    // R_total = 60 Ohm, I = 12 / 60 = 0.2 A
    // V_R1 = 0.2 * 20 = 4.0 V, V_R2 = 0.2 * 40 = 8.0 V
    const circuit: MNACircuit = {
      elements: [
        {id: 'bat1', type: 'battery', nodeA: 'n1', nodeB: 'n_gnd', value: 12.0, internalResistance: 0.0},
        {id: 'r1', type: 'resistor', nodeA: 'n1', nodeB: 'n2', value: 20.0},
        {id: 'r2', type: 'resistor', nodeA: 'n2', nodeB: 'n_gnd', value: 40.0},
      ],
      groundNode: 'n_gnd',
    };

    const solution = solveCircuit(circuit);

    expect(solution.isClosedCircuit).toBe(true);
    expect(solution.totalCurrent).toBeCloseTo(0.2, 3);
    expect(solution.totalEquivalentResistance).toBeCloseTo(60.0, 1);

    expect(solution.nodeVoltages['n1']).toBeCloseTo(12.0, 3);
    expect(solution.nodeVoltages['n2']).toBeCloseTo(8.0, 3); // V2 = 8V across R2 to ground
    expect(solution.nodeVoltages['n_gnd']).toBeCloseTo(0.0, 3);

    expect(solution.elementResults['r1'].voltageDrop).toBeCloseTo(4.0, 3);
    expect(solution.elementResults['r2'].voltageDrop).toBeCloseTo(8.0, 3);
  });

  it('verifies Parallel Circuit (Current Divider)', () => {
    // 10V Battery, R1 = 10 Ohm, R2 = 10 Ohm in parallel
    // R_eq = (10 * 10) / (10 + 10) = 5.0 Ohm
    // I_1 = 10 / 10 = 1.0 A, I_2 = 10 / 10 = 1.0 A, I_total = 2.0 A
    const circuit: MNACircuit = {
      elements: [
        {id: 'bat1', type: 'battery', nodeA: 'v_bus', nodeB: 'n_gnd', value: 10.0, internalResistance: 0.0},
        {id: 'r1', type: 'resistor', nodeA: 'v_bus', nodeB: 'n_gnd', value: 10.0},
        {id: 'r2', type: 'resistor', nodeA: 'v_bus', nodeB: 'n_gnd', value: 10.0},
      ],
      groundNode: 'n_gnd',
    };

    const solution = solveCircuit(circuit);

    expect(solution.isClosedCircuit).toBe(true);
    expect(solution.hasShortCircuit).toBe(false);
    expect(solution.totalCurrent).toBeCloseTo(2.0, 3);
    expect(solution.totalEquivalentResistance).toBeCloseTo(5.0, 1);

    expect(solution.elementResults['r1'].current).toBeCloseTo(1.0, 3);
    expect(solution.elementResults['r2'].current).toBeCloseTo(1.0, 3);
  });

  it('verifies Open Circuit behavior (open switch or broken path)', () => {
    // Battery, open switch, and resistor
    const circuit: MNACircuit = {
      elements: [
        {id: 'bat1', type: 'battery', nodeA: 'n1', nodeB: 'n_gnd', value: 9.0},
        {id: 'sw1', type: 'switch', nodeA: 'n1', nodeB: 'n2', isOpen: true},
        {id: 'r1', type: 'resistor', nodeA: 'n2', nodeB: 'n_gnd', value: 10.0},
      ],
      groundNode: 'n_gnd',
    };

    const solution = solveCircuit(circuit);

    expect(solution.isClosedCircuit).toBe(false);
    expect(solution.totalCurrent).toBe(0);
    expect(solution.status).toBe('open_circuit');
    expect(solution.warnings.some((w) => w.code === 'OPEN_CIRCUIT')).toBe(true);
  });

  it('detects and diagnoses Direct Short Circuit across battery', () => {
    // Battery with positive and negative directly wired together
    const circuit: MNACircuit = {
      elements: [
        {id: 'bat1', type: 'battery', nodeA: 'n_pos', nodeB: 'n_neg', value: 9.0},
        {id: 'w1', type: 'wire', nodeA: 'n_pos', nodeB: 'n_neg'},
      ],
      groundNode: 'n_neg',
    };

    const solution = solveCircuit(circuit);

    expect(solution.hasShortCircuit).toBe(true);
    expect(solution.status).toBe('short_circuit');
    expect(solution.warnings.some((w) => w.code === 'SHORT_CIRCUIT')).toBe(true);
  });

  it('verifies incandescent Lamp illumination and overvoltage burnout', () => {
    // 1. Normal lighting: 6V on a 15 Ohm lamp -> I = 0.4 A, P = 2.4 W
    const normalCircuit: MNACircuit = {
      elements: [
        {id: 'bat1', type: 'battery', nodeA: 'n1', nodeB: 'n_gnd', value: 6.0, internalResistance: 0.0},
        {id: 'lamp1', type: 'lamp', nodeA: 'n1', nodeB: 'n_gnd', value: 15.0, maxPower: 10.0},
      ],
      groundNode: 'n_gnd',
    };
    const normalSol = solveCircuit(normalCircuit);
    const normalLamp = normalSol.elementResults['lamp1'];
    expect(normalLamp.illuminated).toBe(true);
    expect(normalLamp.isBlown).toBe(false);
    expect(normalLamp.brightness).toBeGreaterThan(0.5);

    // 2. Overvoltage burnout: 24V on a 10 Ohm lamp -> P = 57.6 W > 15 W maxPower
    const burnCircuit: MNACircuit = {
      elements: [
        {id: 'bat_high', type: 'battery', nodeA: 'n1', nodeB: 'n_gnd', value: 24.0, internalResistance: 0.0},
        {id: 'lamp_fragile', type: 'lamp', nodeA: 'n1', nodeB: 'n_gnd', value: 10.0, maxPower: 15.0},
      ],
      groundNode: 'n_gnd',
    };
    const burnSol = solveCircuit(burnCircuit);
    const burnLamp = burnSol.elementResults['lamp_fragile'];
    expect(burnLamp.isBlown).toBe(true);
    expect(burnLamp.illuminated).toBe(false);
    expect(burnSol.warnings.some((w) => w.code === 'BULB_BURNOUT')).toBe(true);
  });

  it('verifies LED circuit: forward-bias with resistor, burnout without resistor, and reverse bias', () => {
    // 1. Proper LED circuit: 9V battery, 330 Ohm current-limiting resistor, Red LED (V_f = 2.0V)
    // Expected I ≈ (9 - 2) / (330 + 10) ≈ 7 / 340 ≈ 0.0205 A (20.5 mA) -> safe and illuminated!
    const safeCircuit: MNACircuit = {
      elements: [
        {id: 'bat1', type: 'battery', nodeA: 'n1', nodeB: 'n_gnd', value: 9.0, internalResistance: 0.0},
        {id: 'r_limit', type: 'resistor', nodeA: 'n1', nodeB: 'n2', value: 330.0},
        {id: 'led1', type: 'led', nodeA: 'n2', nodeB: 'n_gnd', forwardVoltage: 2.0, maxCurrent: 0.05},
      ],
      groundNode: 'n_gnd',
    };
    const safeSol = solveCircuit(safeCircuit);
    const safeLed = safeSol.elementResults['led1'];
    expect(safeLed.isConducting).toBe(true);
    expect(safeLed.illuminated).toBe(true);
    expect(safeLed.isBlown).toBe(false);
    expect(safeLed.current).toBeGreaterThan(0.01);
    expect(safeLed.current).toBeLessThan(0.035);

    // 2. Fatal mistake: LED connected directly across 9V battery with NO limiting resistor!
    // Expected: Current far exceeds 50 mA -> LED burns out with diagnosed warning
    const noResistorCircuit: MNACircuit = {
      elements: [
        {id: 'bat1', type: 'battery', nodeA: 'n1', nodeB: 'n_gnd', value: 9.0, internalResistance: 0.2},
        {id: 'led_danger', type: 'led', nodeA: 'n1', nodeB: 'n_gnd', forwardVoltage: 2.0, maxCurrent: 0.05},
      ],
      groundNode: 'n_gnd',
    };
    const dangerSol = solveCircuit(noResistorCircuit);
    const dangerLed = dangerSol.elementResults['led_danger'];
    expect(dangerLed.isBlown).toBe(true);
    expect(dangerLed.illuminated).toBe(false);
    expect(dangerSol.warnings.some((w) => w.code === 'LED_BURNOUT_NO_RESISTOR')).toBe(true);

    // 3. Reversed LED: Anode at Ground, Cathode at +9V
    const reverseCircuit: MNACircuit = {
      elements: [
        {id: 'bat1', type: 'battery', nodeA: 'n1', nodeB: 'n_gnd', value: 9.0, internalResistance: 0.0},
        {id: 'r_limit', type: 'resistor', nodeA: 'n1', nodeB: 'n2', value: 330.0},
        {id: 'led_reversed', type: 'led', nodeA: 'n_gnd', nodeB: 'n2', forwardVoltage: 2.0}, // Anode at ground!
      ],
      groundNode: 'n_gnd',
    };
    const revSol = solveCircuit(reverseCircuit);
    const revLed = revSol.elementResults['led_reversed'];
    expect(revLed.isConducting).toBe(false);
    expect(revLed.illuminated).toBe(false);
    expect(revLed.isReverseBiased).toBe(true);
    expect(revSol.warnings.some((w) => w.code === 'LED_REVERSE_BIAS')).toBe(true);
  });
});
