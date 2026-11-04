/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб — Vitest обёртка для оценочных сценариев ИИ-наставника
 */

import {describe, it, expect} from 'vitest';
import {evalScenarios} from '../eval/scenarios.ts';
import {runScenario} from '../eval/runEval.ts';

process.env.EVAL_FAST = 'true';

describe('AI Tutor Evaluation Suite (15 Scenarios)', () => {
  evalScenarios.forEach((scenario) => {
    it(`[${scenario.expected.language.toUpperCase()}] ${scenario.id}: ${scenario.name}`, async () => {
      const result = await runScenario(scenario);
      expect(result.languageCorrect, `Language error for ${scenario.id}. Output: "${result.outputText}"`).toBe(true);
      expect(result.noHallucinatedNumbers, `Hallucinated numbers in ${scenario.id}. Output: "${result.outputText}"`).toBe(true);
      expect(result.socraticCompliant, `Socratic method broken in ${scenario.id}. Output: "${result.outputText}"`).toBe(true);
      expect(result.passed, `Scenario ${scenario.id} failed details: ${result.details}`).toBe(true);
    });
  });
});
