/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб — Тесты реестра лабораторий (Open-Closed Principle)
 */

import {describe, it, expect} from 'vitest';
import {LabRegistry} from '../labs/registry.ts';
import {CircuitsDCModule} from '../labs/circuits-dc/index.ts';
import {LabModule, LabState} from '../../../shared/types.ts';

describe('Modular Lab System (LabModule plugin interface)', () => {
  it('should register and retrieve CircuitsDCModule', () => {
    LabRegistry.register(CircuitsDCModule, true);
    const retrieved = LabRegistry.get('circuits-dc');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('circuits-dc');
    expect(retrieved?.components.length).toBeGreaterThanOrEqual(4);
  });

  it('should allow adding a new custom lab without modifying the core system', () => {
    const customAstronomyLab: LabModule = {
      id: 'astronomy-solar-system',
      titleKey: 'labs.astronomy.title',
      descriptionKey: 'labs.astronomy.desc',
      discipline: 'physics',
      components: [],
      simulate: (_state: LabState) => ({
        isClosedCircuit: true,
        hasShortCircuit: false,
        totalCurrent: 0,
        totalEquivalentResistance: 0,
        componentStates: {},
        warnings: [],
      }),
      describeState: (_state: LabState) => ({
        labId: 'astronomy-solar-system',
        summaryText: 'Планетарная модель',
        isCircuitComplete: true,
        hasHazard: false,
        activeComponentsCount: 0,
        components: [],
        connectionsCount: 0,
      }),
      lessons: [],
    };

    LabRegistry.register(customAstronomyLab);

    const astro = LabRegistry.get('astronomy-solar-system');
    expect(astro).toBeDefined();
    expect(astro?.id).toBe('astronomy-solar-system');
    expect(LabRegistry.getIds()).toContain('astronomy-solar-system');

    // Базовая лаборатория по-прежнему на месте и работоспособна
    const base = LabRegistry.get('circuits-dc');
    expect(base).toBeDefined();
  });
});
