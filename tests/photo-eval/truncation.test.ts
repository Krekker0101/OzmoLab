/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit test for length truncation recovery, retry fallback, and confidence protection.
 */

import {describe, it, expect} from 'vitest';
import dotenv from 'dotenv';
import {perceiveCircuitPhoto} from '../../server/circuitAgent.ts';
import {NetlistComponent} from '../../shared/schema/netlist.ts';

dotenv.config();

describe('Perception Truncation and Safety Fallbacks', () => {
  it('recovers when first call is truncated by length but higher-limit retry succeeds', async () => {
    let callCount = 0;
    const requestedMaxTokens: number[] = [];

    const mockFetch = async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      callCount++;
      const body = JSON.parse(init?.body as string);
      requestedMaxTokens.push(body.max_tokens);

      if (callCount === 1) {
        // First call: truncated due to reasoning length exhaustion, content is empty
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {content: '', role: 'assistant'},
                finish_reason: 'length',
              },
            ],
            usage: {prompt_tokens: 250, completion_tokens: 2500},
          }),
          {status: 200, headers: {'Content-Type': 'application/json'}},
        );
      }

      // Second call: higher limit (3500) successfully completes netlist
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  circuitId: 'recovered_netlist',
                  components: [
                    {
                      id: 'bat1',
                      type: 'battery',
                      nodeA: 'n1',
                      nodeB: 'n_gnd',
                      value: 9.0,
                    },
                    {
                      id: 'r1',
                      type: 'resistor',
                      nodeA: 'n1',
                      nodeB: 'n_gnd',
                      value: 100.0,
                    },
                  ],
                  groundNode: 'n_gnd',
                }),
                role: 'assistant',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {prompt_tokens: 250, completion_tokens: 1800},
        }),
        {status: 200, headers: {'Content-Type': 'application/json'}},
      );
    };

    const result = await perceiveCircuitPhoto('fake_base64_data', 'test-model', {
      apiKey: 'test-key',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(callCount).toBe(2);
    expect(requestedMaxTokens[0]).toBe(3800);
    expect(requestedMaxTokens[1]).toBe(4500);
    expect(result.retried).toBe(true);
    expect(result.schemaValid).toBe(true);
    expect(result.truncatedFallbackTriggered).toBe(false);
    expect(result.netlist.components.length).toBe(2);
  });

  it('safely warns student when both calls are truncated by length limit (never returns empty answer)', async () => {
    let callCount = 0;

    const mockFetch = async (): Promise<Response> => {
      callCount++;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {content: '', role: 'assistant'},
              finish_reason: 'length',
            },
          ],
          usage: {prompt_tokens: 250, completion_tokens: 2500},
        }),
        {status: 200, headers: {'Content-Type': 'application/json'}},
      );
    };

    const result = await perceiveCircuitPhoto('fake_base64_data', 'test-model', {
      apiKey: 'test-key',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(callCount).toBe(2);
    expect(result.truncatedFallbackTriggered).toBe(true);
    expect(result.finishReason).toBe('length');
    // Ensure student guidance is clear and present (retake photo or build manually)
    expect(result.userMessage).toBeDefined();
    expect(result.userMessage).toContain('соберите цепь вручную на верстаке');
    expect(result.netlist).toBeDefined();
  });

  it('marks low-confidence components (< 0.60) as "unknown" instead of guessing', async () => {
    const mockFetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  circuitId: 'confidence_test',
                  components: [
                    {
                      id: 'bat1',
                      type: 'battery',
                      nodeA: 'n1',
                      nodeB: 'n_gnd',
                      value: 9.0,
                      confidence: 0.98,
                    },
                    {
                      id: 'mystery1',
                      type: 'resistor', // guessed type
                      nodeA: 'n1',
                      nodeB: 'n_gnd',
                      confidence: 0.35, // low confidence!
                    },
                  ],
                  groundNode: 'n_gnd',
                }),
                role: 'assistant',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {prompt_tokens: 200, completion_tokens: 300},
        }),
        {status: 200, headers: {'Content-Type': 'application/json'}},
      );
    };

    const result = await perceiveCircuitPhoto('fake_base64_data', 'test-model', {
      apiKey: 'test-key',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result.schemaValid).toBe(true);
    const bat = result.netlist.components.find((c: NetlistComponent) => c.id === 'bat1');
    const mystery = result.netlist.components.find((c: NetlistComponent) => c.id === 'mystery1');

    expect(bat?.type).toBe('battery');
    // Low confidence component must be safely downgraded to 'unknown'
    expect(mystery?.type).toBe('unknown');
  });

  it('empirically verifies real Baseten truncation fallback against live API with forced small max_tokens', async () => {
    const hasKey = Boolean(process.env.BASETEN_API_KEY);
    if (!hasKey) {
      console.log('Skipping live truncation test: BASETEN_API_KEY not present.');
      return;
    }

    // A minimal 1x1 transparent PNG base64
    const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    // Force max_tokens = 25 to guarantee length truncation during reasoning
    const result = await perceiveCircuitPhoto(tinyPng, undefined, {
      forcedMaxTokens: 25,
      skipRetryOnForcedTruncation: true,
      language: 'ru',
    });

    expect(result).toBeDefined();
    expect(result.truncatedFallbackTriggered).toBe(true);
    expect(result.finishReason).toBe('length');
    // Friendly student message without technical jargon
    expect(result.userMessage).toBeDefined();
    expect(result.userMessage).toContain('Не удалось разобрать это фото');
    expect(result.userMessage).not.toContain('finish_reason');
    expect(result.userMessage).not.toContain('tokens');
    expect(result.netlist).toBeDefined();
  }, 30000);
});
