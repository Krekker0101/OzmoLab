/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Unit Tests for AI Circuit Synthesizer & Generator
 */

import {describe, it, expect, beforeEach} from 'vitest';
import {
  detectCircuitSynthesisIntent,
  synthesizeCircuitByKey,
  extractCircuitFromText,
  generateSimpleCircuit,
  generateParallelLampsCircuit,
  generateOhmLawBenchCircuit,
  generateVoltageDividerCircuit,
  generateRheostatCircuit,
} from '../../../shared/circuitSynthesizer.ts';
import {useLabStore} from '../store/useLabStore.ts';

describe('AI Circuit Synthesizer & Generator (circuitSynthesizer)', () => {
  describe('detectCircuitSynthesisIntent', () => {
    it('detects simple circuit synthesis requests in Russian, Tajik, and English', () => {
      expect(detectCircuitSynthesisIntent('Собери простую цепь')).toBe('simple_circuit');
      expect(detectCircuitSynthesisIntent('Занҷири оддӣ бо лампа соз')).toBe('simple_circuit');
      expect(detectCircuitSynthesisIntent('Please build circuit with lamp')).toBe('simple_circuit');
    });

    it('detects parallel lamps synthesis requests', () => {
      expect(detectCircuitSynthesisIntent('Собери параллельное соединение двух ламп')).toBe('parallel_lamps');
      expect(detectCircuitSynthesisIntent('Пайвасти мувозии ду лампа соз')).toBe('parallel_lamps');
      expect(detectCircuitSynthesisIntent('Connect 2 lamps in parallel')).toBe('parallel_lamps');
    });

    it('detects Ohm law bench synthesis requests', () => {
      expect(detectCircuitSynthesisIntent('Собери стенд для проверки закона Ома')).toBe('ohm_bench');
      expect(detectCircuitSynthesisIntent('Стенди санҷиши қонуни Ом соз')).toBe('ohm_bench');
      expect(detectCircuitSynthesisIntent('Create circuit to measure current with ammeter and voltmeter')).toBe('ohm_bench');
    });

    it('detects voltage divider synthesis requests', () => {
      expect(detectCircuitSynthesisIntent('Сделай делитель напряжения на резисторах')).toBe('voltage_divider');
      expect(detectCircuitSynthesisIntent('Тақсимкунандаи шиддат соз')).toBe('voltage_divider');
      expect(detectCircuitSynthesisIntent('Build a voltage divider')).toBe('voltage_divider');
    });

    it('detects rheostat circuit synthesis requests', () => {
      expect(detectCircuitSynthesisIntent('Собери схему с реостатом и лампой')).toBe('rheostat');
      expect(detectCircuitSynthesisIntent('Схема бо реостат соз')).toBe('rheostat');
      expect(detectCircuitSynthesisIntent('Rheostat dimming circuit')).toBe('rheostat');
    });

    it('returns null for generic messages and pedagogical questions', () => {
      expect(detectCircuitSynthesisIntent('Какая формула для силы тока?')).toBeNull();
      expect(detectCircuitSynthesisIntent('Салом, аҳволатон чӣ тавр?')).toBeNull();
      expect(detectCircuitSynthesisIntent('Схема замкнута. Как мне проверить закон Ома?')).toBeNull();
      expect(detectCircuitSynthesisIntent('Занҷир васл шуд. Чӣ тавр қонуни Омро санҷам?')).toBeNull();
      expect(detectCircuitSynthesisIntent('Что такое делитель напряжения?')).toBeNull();
    });
  });

  describe('synthesizeCircuitByKey and templates', () => {
    it('generates a valid closed simple circuit', () => {
      const circuit = generateSimpleCircuit('ru');
      expect(circuit.components.length).toBe(3); // battery, switch, lamp
      expect(circuit.wires.length).toBe(3);

      const compTypes = circuit.components.map((c) => c.type);
      expect(compTypes).toContain('battery');
      expect(compTypes).toContain('switch');
      expect(compTypes).toContain('lamp');
    });

    it('generates valid parallel lamps circuit topology', () => {
      const circuit = generateParallelLampsCircuit('ru');
      expect(circuit.components.length).toBe(4); // battery, switch, 2 lamps
      expect(circuit.wires.length).toBe(5);

      const lampCount = circuit.components.filter((c) => c.type === 'lamp').length;
      expect(lampCount).toBe(2);
    });

    it('generates valid Ohm law bench circuit with ammeter and voltmeter', () => {
      const circuit = generateOhmLawBenchCircuit('ru');
      expect(circuit.components.length).toBe(5); // battery, switch, ammeter, resistor, voltmeter

      const hasAmmeter = circuit.components.some((c) => c.type === 'ammeter');
      const hasVoltmeter = circuit.components.some((c) => c.type === 'voltmeter');
      const hasResistor = circuit.components.some((c) => c.type === 'resistor');

      expect(hasAmmeter).toBe(true);
      expect(hasVoltmeter).toBe(true);
      expect(hasResistor).toBe(true);
    });

    it('generates valid voltage divider with voltmeter across output resistor', () => {
      const circuit = generateVoltageDividerCircuit('ru');
      expect(circuit.components.length).toBe(5);

      const resistors = circuit.components.filter((c) => c.type === 'resistor');
      expect(resistors.length).toBe(2);
    });

    it('generates valid rheostat dimming circuit', () => {
      const circuit = generateRheostatCircuit('ru');
      const hasRheostat = circuit.components.some((c) => c.type === 'rheostat');
      expect(hasRheostat).toBe(true);
    });
  });

  describe('extractCircuitFromText', () => {
    it('extracts JSON circuit from markdown ```circuit block and leaves clean text', () => {
      const rawResponse = `Вот спроектированная схема для вас! Она проверит закон Ома.

\`\`\`circuit
{
  "id": "test_synth",
  "title": "Тестовая цепь",
  "description": "Описание тестовой цепи",
  "components": [
    {"id": "b1", "type": "battery", "x": 100, "y": 100, "rotation": 0, "values": {"voltage": 9}, "state": {}}
  ],
  "wires": []
}
\`\`\`

Удачи в исследовании!`;

      const result = extractCircuitFromText(rawResponse);
      expect(result.circuit).not.toBeNull();
      expect(result.circuit?.id).toBe('test_synth');
      expect(result.circuit?.title).toBe('Тестовая цепь');
      expect(result.circuit?.components.length).toBe(1);
      expect(result.cleanText).not.toContain('```circuit');
      expect(result.cleanText).toContain('Вот спроектированная схема для вас!');
    });

    it('returns null circuit if no valid circuit block is found', () => {
      const result = extractCircuitFromText('Обычный текстовый ответ без кода.');
      expect(result.circuit).toBeNull();
      expect(result.cleanText).toBe('Обычный текстовый ответ без кода.');
    });
  });

  describe('useLabStore applySynthesizedCircuit integration', () => {
    beforeEach(() => {
      useLabStore.getState().clearWorkbench();
    });

    it('applies synthesized circuit to the lab store and runs simulation', () => {
      const circuit = generateSimpleCircuit('ru');
      expect(useLabStore.getState().components.length).toBe(0);

      useLabStore.getState().applySynthesizedCircuit(circuit);

      expect(useLabStore.getState().components.length).toBe(circuit.components.length);
      expect(useLabStore.getState().wires.length).toBe(circuit.wires.length);

      // Simulation runs automatically:
      const sim = useLabStore.getState().simulationResult;
      expect(sim).not.toBeNull();
      expect(sim?.isClosedCircuit).toBe(true);
      expect(sim?.totalCurrent).toBeGreaterThan(0);
    });
  });
});
