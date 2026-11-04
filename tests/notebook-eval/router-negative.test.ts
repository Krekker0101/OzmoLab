/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Negative & Routing Tests for Notebook Photo Mode
 * Tests router classification, circuit handoff, plain text handling, and unreadable blur fallbacks.
 */

import {describe, it, expect} from 'vitest';
import {routeAndExtractNotebookPhoto} from '../../server/notebookAgent.ts';

describe('Notebook Photo Router & Safety Fallbacks', () => {
  it('correctly classifies a circuit schematic as "circuit" and does not hallucinate point masses', async () => {
    const mockFetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  classification: {
                    category: 'circuit',
                    confidence: 0.95,
                    detectedLanguage: 'en',
                    summary: 'Hand-drawn Ohm law circuit with battery, ammeter, and resistor',
                    problemType: null,
                  },
                  isConfident: true,
                }),
                role: 'assistant',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {prompt_tokens: 300, completion_tokens: 150},
        }),
        {status: 200, headers: {'Content-Type': 'application/json'}},
      );
    };

    const res = await routeAndExtractNotebookPhoto('fake_circuit_base64', {
      language: 'ru',
      customFetch: mockFetch as unknown as typeof fetch,
    });

    expect(res.classification.category).toBe('circuit');
    expect(res.centreOfMass).toBeUndefined();
    expect(res.userGuidance).toContain('электрическая схема');
  });

  it('correctly classifies plain lecture text / formulas as "other_notes" and never invents dummy problems', async () => {
    const mockFetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  classification: {
                    category: 'other_notes',
                    confidence: 0.9,
                    detectedLanguage: 'ru',
                    summary: 'Страница с формулами кинематики и законами движения',
                    problemType: null,
                  },
                  rawText: 'v = v0 + at; s = v0t + at^2/2',
                  isConfident: true,
                }),
                role: 'assistant',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {prompt_tokens: 280, completion_tokens: 110},
        }),
        {status: 200, headers: {'Content-Type': 'application/json'}},
      );
    };

    const res = await routeAndExtractNotebookPhoto('fake_notes_base64', {
      language: 'tg',
      customFetch: mockFetch as unknown as typeof fetch,
    });

    expect(res.classification.category).toBe('other_notes');
    expect(res.centreOfMass).toBeUndefined();
    expect(res.resistanceProblem).toBeUndefined();
    // Polite student message in Tajik explaining no supported numerical problem was found
    expect(res.userGuidance).toContain('масъалаи мушаххаси маркази масса ё занҷир ёфт нашуд');
  });

  it('safely handles an unreadable or blurry image without crashing, asking student to re-take photo', async () => {
    const mockFetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  classification: {
                    category: 'not_readable',
                    confidence: 0.1,
                    detectedLanguage: 'other',
                    summary: 'Image is extremely blurred and text cannot be deciphered',
                    problemType: null,
                  },
                  isConfident: false,
                }),
                role: 'assistant',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {prompt_tokens: 150, completion_tokens: 80},
        }),
        {status: 200, headers: {'Content-Type': 'application/json'}},
      );
    };

    const res = await routeAndExtractNotebookPhoto('fake_blurry_base64', {
      language: 'en',
      customFetch: mockFetch as unknown as typeof fetch,
    });

    expect(res.classification.category).toBe('not_readable');
    expect(res.isConfident).toBe(false);
    expect(res.userGuidance).toContain('Could not read this page');
  });

  it('flags isConfident as false for mixed-language ambiguous handwriting so student confirms parameters', async () => {
    const mockFetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  classification: {
                    category: 'supported_problem',
                    confidence: 0.55,
                    detectedLanguage: 'mixed',
                    summary: 'Handwritten Bengali/English center of mass notes',
                    problemType: 'centre_of_mass',
                  },
                  centreOfMass: {
                    dimension: '1D',
                    variableSymbol: 'd',
                    items: [
                      {id: 'm1', mass: 1, x: 0, confidence: 0.5, rawLabel: 'm at 0'},
                      {id: 'm2', mass: 2, x: 1, confidence: 0.45, rawLabel: '2m at d?'},
                    ],
                  },
                  isConfident: false,
                }),
                role: 'assistant',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {prompt_tokens: 350, completion_tokens: 180},
        }),
        {status: 200, headers: {'Content-Type': 'application/json'}},
      );
    };

    const res = await routeAndExtractNotebookPhoto('fake_mixed_handwriting_base64', {
      language: 'ru',
      customFetch: mockFetch as unknown as typeof fetch,
    });

    expect(res.classification.category).toBe('supported_problem');
    expect(res.isConfident).toBe(false);
    expect(res.needsConfirmation).toBe(true);
    expect(res.centreOfMass?.items[0].confidence).toBeLessThan(0.6);
  });
});
