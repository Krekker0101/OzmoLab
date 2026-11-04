import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {
  AgentInputError,
  perceiveCircuitPhoto,
  runPhotoToCircuitAgent,
} from '../circuitAgent.ts';

// Regression: a failed/empty request must NEVER be answered with a demo circuit
// (previously: "LED without resistor" was returned for unrelated photos).
describe('no silent preset substitution', () => {
  const savedKey = process.env.BASETEN_API_KEY;
  beforeEach(() => {
    delete process.env.BASETEN_API_KEY;
  });
  afterEach(() => {
    if (savedKey !== undefined) process.env.BASETEN_API_KEY = savedKey;
  });

  it('perceive without API key returns an empty non-circuit, not a preset', async () => {
    const r = await perceiveCircuitPhoto('data:image/png;base64,AAAA', undefined, {language: 'en' as never});
    expect(r.netlist.isCircuit).toBe(false);
    expect(r.netlist.components).toHaveLength(0);
    expect(r.truncatedFallbackTriggered).toBe(true);
    expect(r.userMessage).toBeTruthy();
  });

  it('perceive with a failing API returns an empty non-circuit', async () => {
    const r = await perceiveCircuitPhoto('data:image/png;base64,AAAA', undefined, {
      apiKey: 'test-key',
      fetchImpl: (async () => {
        throw new Error('network down');
      }) as unknown as typeof fetch,
    });
    expect(r.netlist.components).toHaveLength(0);
    expect(r.netlist.isCircuit).toBe(false);
  });

  it('verify rejects an empty request instead of using a default circuit', async () => {
    await expect(runPhotoToCircuitAgent({language: 'ru'})).rejects.toBeInstanceOf(AgentInputError);
  });

  it('verify rejects an unknown presetId', async () => {
    await expect(runPhotoToCircuitAgent({presetId: 'nope', language: 'ru'})).rejects.toBeInstanceOf(
      AgentInputError,
    );
  });

  it('verify rejects an invalid customNetlist', async () => {
    await expect(
      runPhotoToCircuitAgent({customNetlist: {components: 'x'} as never, language: 'ru'}),
    ).rejects.toBeInstanceOf(AgentInputError);
  });

  it('a perceived battery+ammeter+resistor+voltmeter netlist is analysed as itself', async () => {
    const result = await runPhotoToCircuitAgent({
      language: 'ru',
      customNetlist: {
        circuitId: 'photo_02',
        isCircuit: true,
        groundNode: 'n4',
        components: [
          {id: 'bat1', type: 'battery', nodeA: 'n1', nodeB: 'n4', value: 9, confidence: 0.95},
          {id: 'amm1', type: 'ammeter', nodeA: 'n1', nodeB: 'n3', confidence: 0.9},
          {id: 'r1', type: 'resistor', nodeA: 'n3', nodeB: 'n4', value: 100, confidence: 0.9},
          {id: 'vm1', type: 'voltmeter', nodeA: 'n3', nodeB: 'n4', confidence: 0.9},
        ],
      } as never,
    });
    expect(result.originalNetlist.components.map((c) => c.id)).toEqual(['bat1', 'amm1', 'r1', 'vm1']);
    expect(result.diagnosedIssues.some((w) => w.code === 'LED_BURNOUT_NO_RESISTOR')).toBe(false);
    const text = JSON.stringify(result.explanation);
    expect(text).not.toMatch(/LED|светодиод|n_vcc|330/i);
  });
});
