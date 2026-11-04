/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб — Тесты архитектурного контракта и фабрики LabModule (shared/types/lab.ts)
 */

import {describe, it, expect} from 'vitest';
import {createLabModule, LabModuleConfig} from '../../../shared/types/lab.ts';
import {LabState} from '../../../shared/types.ts';

describe('LabModule architectural schema & factory (shared/types/lab.ts)', () => {
  it('should create a valid LabModule with required fields and defaults', () => {
    const config: LabModuleConfig = {
      id: 'thermodynamics-heat-engine',
      titleKey: 'labs.thermo.title',
      descriptionKey: 'labs.thermo.desc',
      discipline: 'physics',
      components: [],
      simulate: (state: LabState) => ({
        isClosedCircuit: true,
        hasShortCircuit: false,
        totalCurrent: 0,
        totalEquivalentResistance: 0,
        componentStates: {},
        warnings: [],
      }),
    };

    const labModule = createLabModule(config);

    expect(labModule).toBeDefined();
    expect(labModule.id).toBe('thermodynamics-heat-engine');
    expect(labModule.titleKey).toBe('labs.thermo.title');
    expect(labModule.discipline).toBe('physics');
    expect(labModule.metadata?.id).toBe('thermodynamics-heat-engine');
    expect(typeof labModule.simulate).toBe('function');
    expect(typeof labModule.describeState).toBe('function');
    expect(Array.isArray(labModule.lessons)).toBe(true);

    // Проверяем работу авто-сгенерированного describeState
    const dummyState: LabState = {
      labId: 'thermodynamics-heat-engine',
      components: [],
      wires: [],
      selectedComponentId: null,
      activeConnectingTerminal: null,
      simulationResult: null,
      lastSimulatedAt: Date.now(),
    };
    const snapshot = labModule.describeState(dummyState);
    expect(snapshot.labId).toBe('thermodynamics-heat-engine');
    expect(snapshot.summaryText).toContain('Лаборатория thermodynamics-heat-engine');
  });

  it('should throw an error if required configuration fields are missing', () => {
    // Missing id
    expect(() =>
      createLabModule({
        id: '',
        titleKey: 'title',
        descriptionKey: 'desc',
        discipline: 'physics',
        components: [],
        simulate: () => ({} as any),
      })
    ).toThrowError(/Lab module id is required/);

    // Missing titleKey
    expect(() =>
      createLabModule({
        id: 'test-lab',
        titleKey: '',
        descriptionKey: 'desc',
        discipline: 'physics',
        components: [],
        simulate: () => ({} as any),
      })
    ).toThrowError(/titleKey is required/);

    // Missing simulate hook
    expect(() =>
      createLabModule({
        id: 'test-lab',
        titleKey: 'title',
        descriptionKey: 'desc',
        discipline: 'physics',
        components: [],
        simulate: undefined as any,
      })
    ).toThrowError(/simulate hook is required/);
  });
});
