/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб — Тесты математической симуляции цепей и проекции для ИИ
 */

import {describe, it, expect} from 'vitest';
import {CircuitsDCModule} from '../labs/circuits-dc/index.ts';
import {LabState} from '../../../shared/types.ts';

describe('Circuits Simulation & AI State Description', () => {
  it('should compute zero current on an open circuit', () => {
    const openState: LabState = {
      labId: 'circuits-dc',
      components: [
        {
          id: 'bat_1',
          type: 'battery',
          x: 100,
          y: 100,
          rotation: 0,
          values: {voltage: 12, internalResistance: 0.1},
          state: {},
        },
        {
          id: 'res_1',
          type: 'resistor',
          x: 250,
          y: 100,
          rotation: 0,
          values: {resistance: 10},
          state: {},
        },
      ],
      wires: [], // нет соединений
      selectedComponentId: null,
      activeConnectingTerminal: null,
      simulationResult: null,
      lastSimulatedAt: Date.now(),
    };

    const result = CircuitsDCModule.simulate(openState);
    expect(result.isClosedCircuit).toBe(false);
    expect(result.totalCurrent).toBe(0);

    const aiSnapshot = CircuitsDCModule.describeState({...openState, simulationResult: result});
    expect(aiSnapshot.isCircuitComplete).toBe(false);
    expect(aiSnapshot.summaryText).toContain('разомкнута');
  });

  it('should calculate current and light the lamp on a closed circuit', () => {
    const closedState: LabState = {
      labId: 'circuits-dc',
      components: [
        {
          id: 'b1',
          type: 'battery',
          x: 100,
          y: 100,
          rotation: 0,
          values: {voltage: 9, internalResistance: 0.2},
          state: {},
        },
        {
          id: 'l1',
          type: 'lamp',
          x: 300,
          y: 100,
          rotation: 0,
          values: {resistance: 15},
          state: {},
        },
      ],
      wires: [
        {id: 'w1', from: {componentId: 'b1', terminalId: 'pos'}, to: {componentId: 'l1', terminalId: 'term_a'}},
        {id: 'w2', from: {componentId: 'l1', terminalId: 'term_b'}, to: {componentId: 'b1', terminalId: 'neg'}},
      ],
      selectedComponentId: null,
      activeConnectingTerminal: null,
      simulationResult: null,
      lastSimulatedAt: Date.now(),
    };

    const result = CircuitsDCModule.simulate(closedState);
    expect(result.isClosedCircuit).toBe(true);
    expect(result.hasShortCircuit).toBe(false);
    // I = 9 / (15 + 0.2) ≈ 0.592 A
    expect(result.totalCurrent).toBeGreaterThan(0.5);
    expect(result.totalCurrent).toBeLessThan(0.7);

    const lampComp = closedState.components.find((c) => c.id === 'l1');
    expect(lampComp?.state.illuminated).toBe(true);

    const aiSnapshot = CircuitsDCModule.describeState({...closedState, simulationResult: result});
    expect(aiSnapshot.isCircuitComplete).toBe(true);
    expect(aiSnapshot.summaryText).toContain('Цепь замкнута');
  });
});
