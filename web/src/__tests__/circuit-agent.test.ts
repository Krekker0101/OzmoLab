/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Photo-to-Circuit Lab Agent — Unit Tests for Full Agent Verification Pipeline
 */

import {describe, it, expect} from 'vitest';
import {
  runPhotoToCircuitAgent,
  proposeCircuitFix,
  generateTeacherExplanation,
  PRESET_CIRCUITS,
} from '../../../server/circuitAgent.ts';
import {convertNetlistToMNACircuit} from '../../../shared/schema/netlist.ts';
import {solveCircuit} from '../../../shared/solver/mnaSolver.ts';

describe('Photo-to-Circuit Lab Agent Verification Pipeline', () => {
  it('diagnoses LED burnout without resistor, synthesizes 330Ω fix, re-verifies safely, and explains in Russian', async () => {
    const result = await runPhotoToCircuitAgent({
      presetId: 'led_missing_resistor',
      language: 'ru',
    });

    expect(result.runId).toBeDefined();
    expect(result.hasMistake).toBe(true);
    expect(result.diagnosedIssues.some((w) => w.code === 'LED_BURNOUT_NO_RESISTOR')).toBe(true);

    // Verify 7 steps were executed in sequence
    expect(result.steps).toHaveLength(7);
    const stepNames = result.steps.map((s) => s.step);
    expect(stepNames).toEqual([
      'perception',
      'netlist',
      'solve_original',
      'diagnosis',
      'propose_fix',
      'solve_fixed',
      'explanation',
    ]);

    // Check synthesized fix
    expect(result.proposedFixNetlist).toBeDefined();
    const fixedComponents = result.proposedFixNetlist!.components;
    const addedResistor = fixedComponents.find((c) => c.type === 'resistor');
    expect(addedResistor).toBeDefined();
    expect(addedResistor!.value).toBe(330); // 330 Ohm standard E24 resistor

    // Check re-verified solution
    expect(result.fixedSolution).toBeDefined();
    expect(result.fixedSolution!.status).toBe('ok');
    expect(result.fixedSolution!.hasShortCircuit).toBe(false);
    const fixedLed = result.fixedSolution!.elementResults['led1'];
    expect(fixedLed.isBlown).toBe(false);
    expect(fixedLed.illuminated).toBe(true);
    expect(fixedLed.current).toBeGreaterThan(0.015);
    expect(fixedLed.current).toBeLessThan(0.03);

    // Check teacher explanation
    expect(result.explanation.language).toBe('ru');
    expect(result.explanation.title).toContain('Светодиод');
    expect(result.explanation.formulaSteps.length).toBeGreaterThanOrEqual(3);
    expect(result.explanation.safetyNote).toBeDefined();
  });

  it('generates teacher explanation in Tajik (tg) when requested', async () => {
    const result = await runPhotoToCircuitAgent({
      presetId: 'led_missing_resistor',
      language: 'tg',
    });

    expect(result.explanation.language).toBe('tg');
    expect(result.explanation.title).toContain('Диоди');
    expect(result.explanation.whatWentWrong).toContain('Батарея');
    expect(result.explanation.physicsLaw).toContain('Қонуни Ом');
  });

  it('diagnoses Direct Short Circuit and synthesizes safe load fix', async () => {
    const result = await runPhotoToCircuitAgent({
      presetId: 'direct_short_circuit',
      language: 'ru',
    });

    expect(result.hasMistake).toBe(true);
    expect(result.diagnosedIssues.some((w) => w.code === 'SHORT_CIRCUIT')).toBe(true);
    expect(result.originalSolution.hasShortCircuit).toBe(true);

    expect(result.proposedFixNetlist).toBeDefined();
    expect(result.fixedSolution).toBeDefined();
    expect(result.fixedSolution!.hasShortCircuit).toBe(false);
    expect(result.fixedSolution!.status).toBe('ok');
  });

  it('diagnoses Open Knife Switch and proposes closing the loop', async () => {
    const result = await runPhotoToCircuitAgent({
      presetId: 'open_switch_loop',
      language: 'ru',
    });

    expect(result.hasMistake).toBe(true);
    expect(result.diagnosedIssues.some((w) => w.code === 'OPEN_CIRCUIT')).toBe(true);

    expect(result.proposedFixNetlist).toBeDefined();
    const fixedSwitch = result.proposedFixNetlist!.components.find((c) => c.type === 'switch');
    expect(fixedSwitch?.isOpen).toBe(false);

    expect(result.fixedSolution?.elementResults['lamp1']?.illuminated).toBe(true);
  });

  it('diagnoses Reversed LED and corrects polarity', async () => {
    const result = await runPhotoToCircuitAgent({
      presetId: 'led_reverse_biased',
      language: 'ru',
    });

    expect(result.hasMistake).toBe(true);
    expect(result.diagnosedIssues.some((w) => w.code === 'LED_REVERSE_BIAS')).toBe(true);

    expect(result.proposedFixNetlist).toBeDefined();
    const fixedLed = result.fixedSolution?.elementResults['led_rev'];
    expect(fixedLed?.isReverseBiased).toBe(false);
  });

  it('passes a properly designed circuit with zero warnings', async () => {
    const result = await runPhotoToCircuitAgent({
      presetId: 'proper_safe_circuit',
      language: 'ru',
    });

    expect(result.hasMistake).toBe(false);
    expect(result.diagnosedIssues).toHaveLength(0);
    expect(result.proposedFixNetlist).toBeUndefined();
    expect(result.explanation.title).toContain('Отлично');
  });
});
