/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Negative Test Suite: Verifies that non-circuit images (mechanics, optics, general text)
 * politely report that no circuit is detected, ask for another photo, and NEVER invent components.
 */

import {describe, it, expect} from 'vitest';
import fs from 'fs';
import path from 'path';
import {perceiveCircuitPhoto, runPhotoToCircuitAgent} from '../../server/circuitAgent.ts';

describe('Negative Non-Circuit Perception and Pipeline Tests', () => {
  it('correctly handles a non-circuit mock perception without inventing components', async () => {
    const mockFetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  circuitId: 'non_circuit',
                  isCircuit: false,
                  components: [],
                  message: 'No electrical circuit detected. Contains mechanics equations.',
                }),
                role: 'assistant',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {prompt_tokens: 150, completion_tokens: 45},
        }),
        {status: 200, headers: {'Content-Type': 'application/json'}},
      );
    };

    const resultRu = await perceiveCircuitPhoto('fake_mechanics_base64', 'test-model', {
      apiKey: 'test-key',
      fetchImpl: mockFetch as unknown as typeof fetch,
      language: 'ru',
    });

    expect(resultRu.schemaValid).toBe(true);
    expect(resultRu.netlist.isCircuit).toBe(false);
    expect(resultRu.netlist.components.length).toBe(0);
    expect(resultRu.userMessage).toContain('На этой фотографии не обнаружена электрическая цепь');

    // Test in Tajik
    const resultTg = await perceiveCircuitPhoto('fake_mechanics_base64', 'test-model', {
      apiKey: 'test-key',
      fetchImpl: mockFetch as unknown as typeof fetch,
      language: 'tg',
    });

    expect(resultTg.netlist.isCircuit).toBe(false);
    expect(resultTg.netlist.components.length).toBe(0);
    expect(resultTg.userMessage).toContain('Дар ин акс занҷири барқӣ ёфт нашуд');

    // Test in English
    const resultEn = await perceiveCircuitPhoto('fake_mechanics_base64', 'test-model', {
      apiKey: 'test-key',
      fetchImpl: mockFetch as unknown as typeof fetch,
      language: 'en',
    });

    expect(resultEn.netlist.isCircuit).toBe(false);
    expect(resultEn.netlist.components.length).toBe(0);
    expect(resultEn.userMessage).toContain('No electrical circuit was found in this photo');
  });

  it('safely handles model returning "unknown" label stating no circuit found without inventing parts', async () => {
    const mockFetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  circuitId: 'detected_circuit_1',
                  components: [
                    {
                      id: 'comp_unknown',
                      type: 'unknown',
                      nodeA: 'none',
                      nodeB: 'none',
                      confidence: 0.1,
                      label: 'no electrical circuit detected - image contains only physics mechanics free-body diagrams',
                    },
                  ],
                }),
                role: 'assistant',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {prompt_tokens: 150, completion_tokens: 65},
        }),
        {status: 200, headers: {'Content-Type': 'application/json'}},
      );
    };

    const result = await perceiveCircuitPhoto('fake_optics_base64', 'test-model', {
      apiKey: 'test-key',
      fetchImpl: mockFetch as unknown as typeof fetch,
      language: 'ru',
    });

    expect(result.schemaValid).toBe(true);
    // Sanitizer detects only non-circuit unknowns and clears them out completely
    expect(result.netlist.isCircuit).toBe(false);
    expect(result.netlist.components.length).toBe(0);
    expect(result.userMessage).toBeDefined();
    expect(result.userMessage).toContain('На этой фотографии не обнаружена электрическая цепь');
  });

  it('runs the full agent pipeline on a non-circuit photo and politely guides the student', async () => {
    const runResult = await runPhotoToCircuitAgent({
      customNetlist: {
        circuitId: 'non_circuit_test',
        isCircuit: false,
        components: [],
      },
      language: 'ru',
    });

    expect(runResult.hasMistake).toBe(false);
    expect(runResult.originalNetlist.components.length).toBe(0);
    expect(runResult.explanation.title).toContain('На фото не обнаружена электрическая цепь');
    expect(runResult.explanation.howToFix).toContain('Пожалуйста, сфотографируйте электрическую цепь');
  });
});
