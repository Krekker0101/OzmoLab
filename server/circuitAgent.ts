/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Photo-to-Circuit Lab Agent — Core Agent Verification Pipeline
 *
 * Architecture:
 * 1. Perceive: Multi-modal vision analysis (Meta Muse Spark Open via Baseten / Meta Model API / fallback)
 * 2. Netlist: Convert detected components & junctions to Zod-validated NetlistCircuit
 * 3. Verify: Deterministic Modified Nodal Analysis (MNA DC solver)
 * 4. Diagnose: Detect short circuits, open loops, overloads, and burnout hazards
 * 5. Propose Fix: Algorithmically generate corrected circuit topology (e.g. series limiting resistor)
 * 6. Re-Verify: Re-run deterministic MNA solver on fixed circuit to verify safety and illumination
 * 7. Explain: Pedagogical explanation in Tajik or Russian like a physics teacher in a lab-deprived school
 */

import {
  NetlistCircuit,
  NetlistComponent,
  convertNetlistToMNACircuit,
  validateNetlist,
} from '../shared/schema/netlist.ts';
import {solveCircuit} from '../shared/solver/mnaSolver.ts';
import {MNASolution, MNAWarning} from '../shared/solver/types.ts';
import {t} from '../shared/i18n.ts';
import {SupportedLanguage} from '../shared/types.ts';

export interface AgentPipelineStep {
  step:
    | 'perception'
    | 'netlist'
    | 'solve_original'
    | 'diagnosis'
    | 'propose_fix'
    | 'solve_fixed'
    | 'explanation';
  status: 'pending' | 'success' | 'warning' | 'error';
  title: string;
  description: string;
  timestamp: number;
  data?: unknown;
}

export interface AgentExplanation {
  language: 'tg' | 'ru' | 'en';
  title: string;
  summary: string;
  whatWentWrong: string;
  physicsLaw: string;
  formulaSteps: string[];
  howToFix: string;
  safetyNote?: string;
}

export interface AgentRunResult {
  runId: string;
  modelUsed: string;
  steps: AgentPipelineStep[];
  originalNetlist: NetlistCircuit;
  originalSolution: MNASolution;
  diagnosedIssues: MNAWarning[];
  hasMistake: boolean;
  proposedFixNetlist?: NetlistCircuit;
  fixedSolution?: MNASolution;
  explanation: AgentExplanation;
}

export interface AgentRequest {
  imageBase64?: string;
  presetId?: string;
  customNetlist?: NetlistCircuit;
  language?: SupportedLanguage;
}

function localized(language: SupportedLanguage, tg: string, ru: string, en: string): string {
  return language === 'en' ? en : language === 'ru' ? ru : tg;
}

/**
 * Built-in reference presets representing typical student experimental circuits
 * (used for live demos, offline evaluation, and zero-latency exploration).
 */
export const PRESET_CIRCUITS: Record<string, {name: string; netlist: NetlistCircuit}> = {
  led_missing_resistor: {
    name: 'LED Connected Directly to 9V Battery (Burnout Hazard)',
    netlist: {
      circuitId: 'preset_led_danger',
      components: [
        {
          id: 'bat1',
          type: 'battery',
          nodeA: 'n_vcc',
          nodeB: 'n_gnd',
          value: 9.0,
          internalResistance: 0.2,
          label: '9V Battery',
          boundingBox: {ymin: 200, xmin: 80, ymax: 550, xmax: 320},
        },
        {
          id: 'led1',
          type: 'led',
          nodeA: 'n_vcc',
          nodeB: 'n_gnd',
          forwardVoltage: 2.0,
          maxCurrent: 0.05,
          label: 'Red LED',
          boundingBox: {ymin: 220, xmin: 650, ymax: 500, xmax: 880},
        },
      ],
      groundNode: 'n_gnd',
      metadata: {
        source: 'preset',
        description: 'Red LED wired directly across 9V battery terminals with no current limiting resistor',
      },
    },
  },
  direct_short_circuit: {
    name: 'Battery Direct Short Circuit (Fire Hazard)',
    netlist: {
      circuitId: 'preset_short_circuit',
      components: [
        {
          id: 'bat1',
          type: 'battery',
          nodeA: 'n_pos',
          nodeB: 'n_neg',
          value: 9.0,
          internalResistance: 0.2,
          label: '9V Battery',
          boundingBox: {ymin: 150, xmin: 100, ymax: 600, xmax: 350},
        },
        {
          id: 'wire_short',
          type: 'wire',
          nodeA: 'n_pos',
          nodeB: 'n_neg',
          label: 'Jumper Wire',
          boundingBox: {ymin: 180, xmin: 400, ymax: 580, xmax: 600},
        },
      ],
      groundNode: 'n_neg',
      metadata: {
        source: 'preset',
        description: 'Wire directly connecting battery positive and negative terminals',
      },
    },
  },
  open_switch_loop: {
    name: 'Circuit with Open Switch (Incomplete Loop)',
    netlist: {
      circuitId: 'preset_open_switch',
      components: [
        {
          id: 'bat1',
          type: 'battery',
          nodeA: 'n1',
          nodeB: 'n_gnd',
          value: 6.0,
          internalResistance: 0.0,
          label: '6V Battery',
          boundingBox: {ymin: 200, xmin: 50, ymax: 600, xmax: 250},
        },
        {
          id: 'sw1',
          type: 'switch',
          nodeA: 'n1',
          nodeB: 'n2',
          isOpen: true,
          label: 'Knife Switch (Open)',
          boundingBox: {ymin: 100, xmin: 350, ymax: 300, xmax: 600},
        },
        {
          id: 'lamp1',
          type: 'lamp',
          nodeA: 'n2',
          nodeB: 'n_gnd',
          value: 15.0,
          maxPower: 12.0,
          label: 'Incandescent Lamp',
          boundingBox: {ymin: 350, xmin: 700, ymax: 650, xmax: 920},
        },
      ],
      groundNode: 'n_gnd',
      metadata: {
        source: 'preset',
        description: 'Lamp connected through an open switch',
      },
    },
  },
  led_reverse_biased: {
    name: 'Reversed LED Polarity (Anode at Negative)',
    netlist: {
      circuitId: 'preset_reversed_led',
      components: [
        {
          id: 'bat1',
          type: 'battery',
          nodeA: 'n1',
          nodeB: 'n_gnd',
          value: 9.0,
          label: '9V Battery',
          boundingBox: {ymin: 200, xmin: 80, ymax: 550, xmax: 300},
        },
        {
          id: 'r1',
          type: 'resistor',
          nodeA: 'n1',
          nodeB: 'n2',
          value: 330.0,
          label: '330Ω Resistor',
          boundingBox: {ymin: 120, xmin: 400, ymax: 300, xmax: 650},
        },
        {
          id: 'led_rev',
          type: 'led',
          nodeA: 'n_gnd', // Anode mistakenly connected to ground!
          nodeB: 'n2', // Cathode connected to +9V via resistor
          forwardVoltage: 2.0,
          label: 'LED (Reversed)',
          boundingBox: {ymin: 350, xmin: 700, ymax: 650, xmax: 900},
        },
      ],
      groundNode: 'n_gnd',
      metadata: {
        source: 'preset',
        description: 'LED connected with reverse polarity',
      },
    },
  },
  proper_safe_circuit: {
    name: 'Correct Working Circuit: 9V Battery, 330Ω Resistor, Safe LED',
    netlist: {
      circuitId: 'preset_safe_working',
      components: [
        {
          id: 'bat1',
          type: 'battery',
          nodeA: 'n1',
          nodeB: 'n_gnd',
          value: 9.0,
          internalResistance: 0.2,
          label: '9V Battery',
          boundingBox: {ymin: 200, xmin: 80, ymax: 550, xmax: 300},
        },
        {
          id: 'r_limit',
          type: 'resistor',
          nodeA: 'n1',
          nodeB: 'n2',
          value: 330.0,
          label: '330Ω Limiting Resistor',
          boundingBox: {ymin: 120, xmin: 380, ymax: 320, xmax: 650},
        },
        {
          id: 'led1',
          type: 'led',
          nodeA: 'n2',
          nodeB: 'n_gnd',
          forwardVoltage: 2.0,
          maxCurrent: 0.05,
          label: 'Red LED (Illuminated)',
          boundingBox: {ymin: 350, xmin: 700, ymax: 650, xmax: 900},
        },
      ],
      groundNode: 'n_gnd',
      metadata: {
        source: 'preset',
        description: 'Properly designed DC LED circuit with current limiting resistor',
      },
    },
  },
};

export interface PerceptionDetails {
  netlist: NetlistCircuit;
  modelUsed: string;
  finishReason?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  schemaValid?: boolean;
  retried?: boolean;
  truncatedFallbackTriggered?: boolean;
  userMessage?: string;
  error?: string;
}

/**
 * Calls Meta Muse Spark Open via Baseten (or fallback API) to perceive circuit photograph.
 * Handles length truncation with automatic higher-budget retry, safe student-facing error messages,
 * and component uncertainty assignment (confidence < 0.60 -> 'unknown').
 */
export async function perceiveCircuitPhoto(
  imageBase64: string,
  modelId = process.env.BASETEN_MODEL_ID || 'meta-models/muse-spark-open-1026',
  options?: {
    apiUrl?: string;
    apiKey?: string;
    fetchImpl?: typeof fetch;
    language?: SupportedLanguage;
    forcedMaxTokens?: number;
    skipRetryOnForcedTruncation?: boolean;
    abortSignal?: AbortSignal;
  },
): Promise<PerceptionDetails> {
  const basetenKey = options?.apiKey || process.env.BASETEN_API_KEY;
  const apiUrl = options?.apiUrl || process.env.BASETEN_API_URL || 'https://inference.baseten.co/v1';
  const customFetch = options?.fetchImpl || fetch;
  const lang: SupportedLanguage = options?.language || 'ru';

  const systemPrompt = `You are the Photo-to-Circuit Perception Agent for Ozmo Lab.
Analyze the user's photograph.
Reason concisely in 2-3 sentences max before producing the JSON.

CRITICAL RULES FOR ACCURACY AND SAFETY:
1. NON-CIRCUIT CHECK: If the photograph does NOT contain an electrical circuit (for example, mechanics formulas, inclined planes, pulleys, optics lens ray tracings, or general text/notes):
   Output: {"circuitId":"non_circuit","isCircuit":false,"components":[],"message":"No electrical circuit detected."}
   Do NOT invent components for non-circuit photographs.
2. If uncertain about a component (confidence < 0.60), set "type": "unknown" and specify your confidence (0.0..1.0) rather than guessing.
3. For switches: if open/separated, set "isOpen": true; if closed, set "isOpen": false.
4. For voltmeters: mark "type": "voltmeter". For ammeters: mark "type": "ammeter".
5. Output ONLY a valid compact JSON object matching this schema:
{"circuitId":"detected_circuit_1","isCircuit":true,"components":[{"id":"bat1","type":"battery"|"resistor"|"lamp"|"led"|"switch"|"wire"|"ammeter"|"voltmeter"|"unknown","nodeA":"terminal_a","nodeB":"terminal_b","value":number,"internalResistance":number,"isOpen":boolean,"forwardVoltage":number,"confidence":0.0..1.0,"label":"string","boundingBox":{"ymin":0..1000,"xmin":0..1000,"ymax":0..1000,"xmax":0..1000}}],"groundNode":"negative_terminal_node"}
Do not include markdown fences or text outside the JSON.`;

  // Helper to sanitize components (e.g. low confidence -> unknown, non-circuit guard)
  const sanitizeNetlist = (netlist: NetlistCircuit): NetlistCircuit => {
    if (netlist.isCircuit === false || !netlist.components || netlist.components.length === 0) {
      return {
        ...netlist,
        isCircuit: false,
        components: [],
      };
    }

    const hasOnlyNonCircuitUnknowns = netlist.components.every(
      (c) =>
        c.type === 'unknown' &&
        (c.label?.toLowerCase().includes('no circuit') ||
          c.label?.toLowerCase().includes('no electrical circuit') ||
          c.label?.toLowerCase().includes('mechanics') ||
          c.label?.toLowerCase().includes('optics') ||
          c.label?.toLowerCase().includes('not a circuit')),
    );

    if (hasOnlyNonCircuitUnknowns) {
      return {
        ...netlist,
        isCircuit: false,
        components: [],
      };
    }

    const sanitizedComponents = netlist.components.map((comp) => {
      const conf = comp.confidence ?? 1.0;
      if (conf < 0.60 && comp.type !== 'unknown') {
        return {
          ...comp,
          type: 'unknown' as const,
          label: `${comp.label || comp.type} (low confidence: ${(conf * 100).toFixed(0)}%)`,
        };
      }
      return comp;
    });

    return {
      ...netlist,
      isCircuit: true,
      components: sanitizedComponents,
    };
  };

  // 1. Primary: Baseten Muse Spark Open endpoint
  if (basetenKey) {
    let retried = false;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    const startTime = Date.now();

    try {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageUrl = `data:image/jpeg;base64,${cleanBase64}`;

      // Setting initial budget to 3800 avoids cutting off the model's natural reasoning phase (~2500 tokens)
      const initialMaxTokens = options?.forcedMaxTokens ?? 3800;
      const requestBody = {
        model: modelId,
        messages: [
          {role: 'system', content: systemPrompt},
          {
            role: 'user',
            content: [
              {type: 'text', text: 'Extract the electrical circuit netlist as compact JSON. Keep reasoning under 80 words.'},
              {type: 'image_url', image_url: {url: imageUrl}},
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: initialMaxTokens,
      };

      const response = await customFetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${basetenKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: options?.abortSignal,
      });

      if (response.ok) {
        const json = await response.json();
        const choice = json.choices?.[0];
        let finishReason = choice?.finish_reason || 'stop';
        totalPromptTokens += json.usage?.prompt_tokens || 0;
        totalCompletionTokens += json.usage?.completion_tokens || 0;

        let content = choice?.message?.content || choice?.message?.reasoning_content;

        // Check if response was truncated due to length exhaustion before producing complete JSON
        const isTruncated =
          finishReason === 'length' &&
          (!content || content.trim().length === 0 || !content.includes('}'));

        if (isTruncated) {
          retried = true;
          if (!options?.skipRetryOnForcedTruncation) {
            // Step 3 requirement: Fallback with one retry at higher limit (4500 max_tokens)
            const retryMaxTokens = options?.forcedMaxTokens ? options.forcedMaxTokens : 4500;
            const retryLengthResponse = await customFetch(`${apiUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${basetenKey}`,
              },
              body: JSON.stringify({
                ...requestBody,
                max_tokens: retryMaxTokens,
              }),
              signal: options?.abortSignal,
            });

            if (retryLengthResponse.ok) {
              const retryJson = await retryLengthResponse.json();
              const retryChoice = retryJson.choices?.[0];
              finishReason = retryChoice?.finish_reason || 'stop';
              totalPromptTokens += retryJson.usage?.prompt_tokens || 0;
              totalCompletionTokens += retryJson.usage?.completion_tokens || 0;
              content = retryChoice?.message?.content || retryChoice?.message?.reasoning_content;
            }
          }

          // If STILL truncated with empty content after retry:
          if (
            finishReason === 'length' &&
            (!content || content.trim().length === 0 || !content.includes('}'))
          ) {
            const fallbackStudentMessage = t('circuit_agent.fallback_unread', lang);
            return {
              netlist: unreadableNetlist(),
              modelUsed: `Baseten (${modelId} - Truncated by token limit)`,
              finishReason: 'length',
              promptTokens: totalPromptTokens,
              completionTokens: totalCompletionTokens,
              latencyMs: Date.now() - startTime,
              schemaValid: false,
              retried: true,
              truncatedFallbackTriggered: true,
              userMessage: fallbackStudentMessage,
              error: 'Response truncated by token limit before completion (finish_reason: length)',
            };
          }
        }

        if (content) {
          let parsed: unknown;
          let val: ReturnType<typeof validateNetlist> = {success: false, error: ''};

          try {
            parsed = parseJsonFromText(content);
            val = validateNetlist(parsed);
          } catch (pErr) {
            val = {success: false, error: String(pErr)};
          }

          if (val.success && val.data) {
            const sanitized = sanitizeNetlist(val.data);
            const userMsg = sanitized.isCircuit === false ? t('circuit_agent.not_a_circuit', lang) : undefined;
            return {
              netlist: sanitized,
              modelUsed: `Baseten (${modelId})`,
              finishReason,
              promptTokens: totalPromptTokens,
              completionTokens: totalCompletionTokens,
              latencyMs: Date.now() - startTime,
              schemaValid: true,
              retried,
              truncatedFallbackTriggered: false,
              userMessage: userMsg,
            };
          }

          // Retry with validation feedback if output schema was invalid (max 1 retry)
          retried = true;
          const retryResponse = await customFetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${basetenKey}`,
            },
            body: JSON.stringify({
              model: modelId,
              messages: [
                {role: 'system', content: systemPrompt},
                {
                  role: 'user',
                  content: [
                    {type: 'text', text: 'Extract the electrical circuit netlist from this photograph.'},
                    {type: 'image_url', image_url: {url: imageUrl}},
                  ],
                },
                {role: 'assistant', content: String(content).slice(0, 500)},
                {
                  role: 'user',
                  content: `Your previous output had validation errors: ${val.error || 'schema mismatch'}. Please output ONLY the corrected JSON matching the schema.`,
                },
              ],
              temperature: 0.1,
              max_tokens: 2500,
            }),
          });

          if (retryResponse.ok) {
            const retryJson = await retryResponse.json();
            const retryChoice = retryJson.choices?.[0];
            totalPromptTokens += retryJson.usage?.prompt_tokens || 0;
            totalCompletionTokens += retryJson.usage?.completion_tokens || 0;
            const retryFinishReason = retryChoice?.finish_reason || 'stop';
            const retryContent = retryChoice?.message?.content || retryChoice?.message?.reasoning_content;

            if (retryContent) {
              try {
                const retryParsed = parseJsonFromText(retryContent);
                const retryVal = validateNetlist(retryParsed);
                if (retryVal.success && retryVal.data) {
                  return {
                    netlist: sanitizeNetlist(retryVal.data),
                    modelUsed: `Baseten (${modelId} - schema corrected)`,
                    finishReason: retryFinishReason,
                    promptTokens: totalPromptTokens,
                    completionTokens: totalCompletionTokens,
                    latencyMs: Date.now() - startTime,
                    schemaValid: true,
                    retried: true,
                    truncatedFallbackTriggered: false,
                  };
                }
              } catch (retryErr) {
                console.warn('[CircuitAgent] Error parsing retry response:', retryErr);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[CircuitAgent] Baseten inference error:', err);
    }
  }

  // 2. Honest failure: never invent a circuit. No key, API error or unusable output -> "unreadable".
  return {
    netlist: unreadableNetlist(),
    modelUsed: 'Perception unavailable',
    finishReason: 'error',
    schemaValid: false,
    retried: false,
    truncatedFallbackTriggered: true,
    userMessage: t('circuit_agent.fallback_unread', lang),
    error: 'Perception failed: no API key, request error or invalid model output',
  };
}

/** Empty, explicitly non-circuit netlist used when a photo cannot be read. Never a preset. */
export function unreadableNetlist(): NetlistCircuit {
  return {circuitId: 'unreadable', isCircuit: false, components: [], message: 'Photo could not be read.'};
}

/**
 * Helper to strip markdown block fences (```json ... ```) or extract the outermost JSON object
 */
export function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  }
  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    return JSON.parse(trimmed.slice(braceStart, braceEnd + 1));
  }
  return JSON.parse(trimmed);
}

/**
 * Algorithmic Fix Proposer: Analyzes MNA warnings and generates a corrected circuit netlist.
 */
export function proposeCircuitFix(
  originalNetlist: NetlistCircuit,
  solution: MNASolution,
): NetlistCircuit {
  const components: NetlistComponent[] = JSON.parse(JSON.stringify(originalNetlist.components));
  let groundNode = originalNetlist.groundNode || '0';

  // Issue 1: LED Burnout because no series limiting resistor was present
  const ledBurnout = solution.warnings.find((w) => w.code === 'LED_BURNOUT_NO_RESISTOR');
  if (ledBurnout) {
    const ledIndex = components.findIndex((c) => c.id === ledBurnout.elementId || c.type === 'led');
    if (ledIndex !== -1) {
      const led = components[ledIndex];
      const battery = components.find((c) => c.type === 'battery');
      const vBat = battery?.value ?? 9.0;
      const vForward = led.forwardVoltage ?? 2.0;
      const targetI = 0.02; // 20 mA safe current

      // Calculate required resistance: R = (V_bat - V_f) / I
      const rawR = Math.max(10, Math.round((vBat - vForward) / targetI));
      // Snap to standard E24 resistor value (e.g. 330 Ohm for 9V -> 2V drop)
      const standardR = snapToStandardResistor(rawR);

      // Create a new intermediate node between the positive source and the LED anode
      const intermediateNode = `${led.nodeA}_rsafe`;
      const originalAnodeNode = led.nodeA;

      // Rewire LED anode to intermediate node
      led.nodeA = intermediateNode;

      // Insert current-limiting resistor
      const limitResistor: NetlistComponent = {
        id: `r_limit_${Date.now() % 1000}`,
        type: 'resistor',
        nodeA: originalAnodeNode,
        nodeB: intermediateNode,
        value: standardR,
        label: `${standardR}Ω Current-Limiting Resistor`,
        boundingBox: {
          ymin: Math.min(led.boundingBox?.ymin ?? 300, 200),
          xmin: Math.max(50, (led.boundingBox?.xmin ?? 400) - 250),
          ymax: Math.min((led.boundingBox?.ymin ?? 300) + 120, 350),
          xmax: (led.boundingBox?.xmin ?? 400) - 50,
        },
      };

      components.splice(ledIndex, 0, limitResistor);
    }
  }

  // Issue 2: Direct Short Circuit across battery
  const shortCircuit = solution.warnings.find((w) => w.code === 'SHORT_CIRCUIT');
  if (shortCircuit) {
    // Locate the shorting wire that connects directly across positive and negative
    const battery = components.find((c) => c.type === 'battery');
    if (battery) {
      const shortWireIdx = components.findIndex(
        (c) =>
          c.type === 'wire' &&
          ((c.nodeA === battery.nodeA && c.nodeB === battery.nodeB) ||
            (c.nodeA === battery.nodeB && c.nodeB === battery.nodeA)),
      );

      if (shortWireIdx !== -1) {
        // Remove the shorting wire and insert a safe 100 Ohm load resistor so the circuit safely does work
        components.splice(shortWireIdx, 1);

        const hasOtherLoad = components.some((c) => c.type === 'lamp' || c.type === 'resistor' || c.type === 'led');
        if (!hasOtherLoad) {
          components.push({
            id: 'r_load_safe',
            type: 'resistor',
            nodeA: battery.nodeA,
            nodeB: battery.nodeB,
            value: 100.0,
            label: '100Ω Load Resistor',
            boundingBox: {ymin: 250, xmin: 450, ymax: 450, xmax: 700},
          });
        }
      }
    }
  }

  // Issue 3: Open Switch
  const openSwitch = components.find((c) => c.type === 'switch' && c.isOpen);
  if (openSwitch) {
    openSwitch.isOpen = false;
  }

  // Issue 4: Reversed LED (Anode at ground/negative)
  const reversedLedWarn = solution.warnings.find((w) => w.code === 'LED_REVERSE_BIAS');
  if (reversedLedWarn) {
    const revLed = components.find((c) => c.id === reversedLedWarn.elementId);
    if (revLed) {
      const tempNode = revLed.nodeA;
      revLed.nodeA = revLed.nodeB;
      revLed.nodeB = tempNode;
      revLed.label = (revLed.label || 'LED') + ' (Corrected Polarity)';
    }
  }

  return {
    circuitId: `${originalNetlist.circuitId || 'circuit'}_fixed`,
    components,
    groundNode,
    metadata: {
      source: 'agent_fix',
      description: 'Automatically synthesized topology fix verified by deterministic MNA solver',
      detectedAt: Date.now(),
    },
  };
}

/**
 * Snaps a raw resistance calculation to the nearest standard E24 resistor value.
 */
function snapToStandardResistor(ohms: number): number {
  const e24 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
  let multiplier = 1;
  while (ohms >= 100) {
    ohms /= 10;
    multiplier *= 10;
  }
  let closest = e24[0];
  let minDiff = Math.abs(ohms - e24[0]);
  for (const val of e24) {
    const diff = Math.abs(ohms - val);
    if (diff < minDiff) {
      minDiff = diff;
      closest = val;
    }
  }
  return closest * multiplier;
}

/**
 * Generates an inspiring, accessible explanation like a physics teacher in a lab-deprived rural school.
 */
export function generateTeacherExplanation(
  originalNetlist: NetlistCircuit,
  originalSolution: MNASolution,
  fixedNetlist: NetlistCircuit | undefined,
  fixedSolution: MNASolution | undefined,
  lang: SupportedLanguage = 'ru',
): AgentExplanation {
  const warnings = originalSolution.warnings;
  const isTg = lang === 'tg';
  const isEn = lang === 'en';

  // Case 1: LED Burnout without Resistor
  if (warnings.some((w) => w.code === 'LED_BURNOUT_NO_RESISTOR')) {
    const battery = originalNetlist.components.find((c) => c.type === 'battery');
    const led = originalNetlist.components.find((c) => c.type === 'led');
    const vBat = battery?.value ?? 9.0;
    const vLed = led?.forwardVoltage ?? 2.0;
    const addedResistor = fixedNetlist?.components.find((c) => c.id.startsWith('r_limit') || c.type === 'resistor');
    const rVal = addedResistor?.value ?? 330;
    const safeI = fixedSolution?.elementResults[led?.id || '']?.current ?? 0.021;
    const currentMilliAmps = (safeI * 1000).toFixed(1);

    if (isTg) {
      if (isEn) {
        return {
          language: 'en',
          title: 'Diagnosis: the LED will burn out without a current-limiting resistor',
          summary: 'The LED is connected directly to a 9 V source without a series resistor.',
          whatWentWrong: `The battery provides ${vBat} V while the LED drop is only ${vLed} V. The excess voltage causes a dangerous current surge that can destroy the LED junction.`,
          physicsLaw: "Ohm's law: I = ΔU / R; Joule heating: P = I² · R",
          formulaSteps: [
            `1. Resistor voltage: U_R = ${vBat} V - ${vLed} V = ${vBat - vLed} V`,
            '2. Safe LED current: approximately 20 mA',
            `3. Required resistance: R = ${vBat - vLed} V / 0.02 A = ${((vBat - vLed) / 0.02).toFixed(0)} Ω`,
            `4. Select the nearest standard value: ${rVal} Ω`,
            `5. MNA verification: I = ${currentMilliAmps} mA; the LED operates safely.`,
          ],
          howToFix: `Connect a ${rVal} Ω resistor in series between the battery positive terminal and the LED anode.`,
          safetyNote: 'Never connect an LED directly to a voltage source without a current-limiting resistor.',
        };
      }

      return {
        language: 'tg',
        title: 'Огоҳӣ: Диоди рӯшноӣдиҳанда (LED) бе муқовимат месӯзад!',
        summary:
          'Шумо диодро бевосита ба батарея пайваст кардед. LED табиати ғайрихаттӣ дорад ва ҷараёнро бе муқовимат маҳдуд карда наметавонад.',
        whatWentWrong:
          `Батарея шиддати ${vBat}В медиҳад, аммо диод танҳо ${vLed}В лозим дорад. Шиддати барзиёди ${vBat - vLed}В ҷараёни бузургро ба вуҷуд оварда, кристалли нимноқилро фавран месӯзонад.`,
        physicsLaw: 'Қонуни Ом барои қисми занҷир: I = U / R ва Қонуни Ҷоул-Ленс: Q = I² · R · t',
        formulaSteps: [
          `1. Ҳисоби шиддати афтиш: U_R = U_бат - U_диод = ${vBat}В - ${vLed}В = ${vBat - vLed}В`,
          `2. Ҷараёни бехатари диод: I_бехатар ≈ 0.02 А (20 мА)`,
          `3. Ҳисоби муқовимати зарурӣ: R = U_R / I = ${vBat - vLed}В / 0.02А = ${((vBat - vLed) / 0.02).toFixed(0)} Ом`,
          `4. Интихоби муқовимати стандартии E24: мо муқовимати ${rVal} Ом илова кардем.`,
          `5. Санҷиши MNA: Ҷараёни нави занҷир = ${currentMilliAmps} мА (комилан бехатар ва дурахшон!).`,
        ],
        howToFix:
          `Дар пайдарпай байни қутби мусбати батарея ва аноди диод муқовимати ${rVal} Ом пайваст кунед.`,
        safetyNote: 'Ҳеҷ гоҳ диодро бе муқовимати маҳдудкунанда ба манбаи шиддат васл накунед!',
      };
    }

    if (isEn) {
      return {
        language: 'en',
        title: 'Danger: short circuit across the power source',
        summary: 'The positive and negative battery terminals are connected without a useful load.',
        whatWentWrong: 'The external resistance approaches zero, causing the current to rise to a dangerous level.',
        physicsLaw: 'Ohm’s law for a complete circuit: I = ε / (R_external + r_internal)',
        formulaSteps: [
          '1. External resistance: R_external ≈ 0 Ω',
          '2. Short-circuit current: I = 9 V / 0.2 Ω = 45 A',
          '3. This current can rapidly heat the battery and wires and create a fire hazard.',
        ],
        howToFix: 'Remove the shorting wire and connect a load such as a lamp or resistor between the source terminals.',
        safetyNote: 'A short circuit can rapidly heat batteries and wires.',
      };
    }

    return {
      language: 'ru',
      title: 'Диагноз: Светодиод (LED) сгорит без токоограничивающего резистора!',
      summary:
        'Светодиод подключён напрямую к источнику питания 9В без добавочного резистора. Диод — это полупроводник с экспоненциальной ВАХ.',
      whatWentWrong:
        `Батарея выдаёт ${vBat}В, тогда как прямое падение напряжения на красном светодиоде составляет всего ${vLed}В. Разность в ${vBat - vLed}В вызывает лавинообразный рост тока (>0.6А), который мгновенно разрушает p-n переход.`,
      physicsLaw: 'Закон Ома для участка цепи: I = ΔU / R и тепловое действие тока Джоуля-Ленца: P = I² · R',
      formulaSteps: [
        `1. Напряжение, которое должен погасить резистор: U_R = U_пит - U_диод = ${vBat}В - ${vLed}В = ${vBat - vLed}В`,
        `2. Номинальный рабочий ток светодиода: I_ном ≈ 20 мА (0.02 А)`,
        `3. Требуемое сопротивление по закону Ома: R = U_R / I_ном = ${vBat - vLed}В / 0.02А = ${((vBat - vLed) / 0.02).toFixed(0)} Ом`,
        `4. Подбираем ближайший стандартный номинал ряда E24: ${rVal} Ом`,
        `5. Проверка MNA солвером: I = ${currentMilliAmps} мА. Светодиод ярко и безопасно светит!`,
      ],
      howToFix:
        `Включите последовательно перед анодом светодиода резистор номиналом ${rVal} Ом (цветовая маркировка: оранжевый-оранжевый-коричневый-золотой).`,
      safetyNote: 'В реальной школьной лаборатории светодиод без резистора вспыхнет и сгорит за доли секунды!',
    };
  }

  // Case 2: Direct Short Circuit
  if (warnings.some((w) => w.code === 'SHORT_CIRCUIT')) {
    if (isTg) {
      if (isEn) {
        return {
          language: 'en',
          title: 'Open circuit: no current flows',
          summary: 'A break or an open switch was detected in the circuit.',
          whatWentWrong: 'Current cannot flow because the conductive path back to the source is interrupted.',
          physicsLaw: 'Condition for DC current: a closed loop of conductors.',
          formulaSteps: [
            '1. Open-gap resistance: R_open → ∞',
            '2. Current: I = U / R = 0 A',
            '3. Source voltage may be present across the switch, but no current flows through the load.',
          ],
          howToFix: 'Close the switch or restore the broken wire connection.',
        };
      }

      return {
        language: 'tg',
        title: 'Хатар: Расиши кӯтоҳ (КЗ) дар қутбҳои батарея!',
        summary: 'Қутбҳои мусбат ва манфии батарея бо ноқили бе муқовимат пайваст шудаанд.',
        whatWentWrong: 'Муқовимати занҷир қариб ба 0 баробар аст. Ҷараён ба ҳадди хатарнок (>15А) мерасад.',
        physicsLaw: 'Қонуни Ом барои занҷири пурра: I = E / (R + r)',
        formulaSteps: [
          '1. Муқовимати беруна R ≈ 0 Ом',
          '2. Ҷараён танҳо бо муқовимати дохилии батарея r маҳдуд мешавад: I = 9В / 0.2Ом = 45А!',
          '3. Ин миқдор ҷараён батареяро фавран тафсонда, хатари таркиш ё сӯхтор дорад.',
        ],
        howToFix: 'Ноқили расиши кӯтоҳро канда, ба занҷир истеъмолкунанда (лампа ё муқовимат) пайваст кунед.',
        safetyNote: 'Ҳангоми расиши кӯтоҳ батарея ва симҳо метавонанд одамро сӯзонанд!',
      };
    }

    if (isEn) {
      return {
        language: 'en',
        title: 'Incorrect polarity: the LED is connected in reverse',
        summary: 'An LED conducts primarily in one direction and is blocked when reverse-biased.',
        whatWentWrong: 'The anode is connected to the negative terminal and the cathode to the positive terminal, so the p-n junction is blocked.',
        physicsLaw: 'Rectifying behavior of a semiconductor p-n junction.',
        formulaSteps: [
          '1. Reverse voltage blocks charge carriers.',
          '2. Reverse resistance is extremely high.',
          '3. Current is approximately zero and the LED does not light; excessive reverse voltage can damage it.',
        ],
        howToFix: 'Swap the LED leads: connect the longer anode lead to the positive side through a resistor.',
      };
    }

    return {
      language: 'ru',
      title: 'Опасность: Короткое замыкание (КЗ) источника питания!',
      summary: 'Положительный и отрицательный полюса батареи соединены проводником без полезной нагрузки.',
      whatWentWrong: 'Сопротивление внешней цепи стремится к нулю, из-за чего ток подскакивает до предельных величин.',
      physicsLaw: 'Закон Ома для полной цепи: I = ε / (R_внеш + r_внутр)',
      formulaSteps: [
        '1. Внешнее сопротивление цепи R_внеш ≈ 0 Ом',
        '2. Ток короткого замыкания: I_кз = ε / r_внутр = 9В / 0.2Ом = 45 Ампер!',
        '3. Выделяющаяся тепловая мощность Q = I² · r приводит к плавлению изоляции проводов и вздутию батареи.',
      ],
      howToFix: 'Удалите замыкающий провод и включите нагрузку (лампу или резистор) между полюсами источника.',
      safetyNote: 'В лаборатории КЗ моментально перегревает проводники и может вызвать возгорание!',
    };
  }

  // Case 3: Open Circuit / Switch
  if (warnings.some((w) => w.code === 'OPEN_CIRCUIT')) {
    if (isTg) {
      if (isEn) {
        return {
          language: 'en',
          title: 'Excellent! The electrical circuit is assembled correctly and safely',
          summary: 'All components are compatible, currents are within their rated ranges, and there are no overloads.',
          whatWentWrong: 'No topology errors were detected.',
          physicsLaw: "Ohm's and Kirchhoff's laws are satisfied.",
          formulaSteps: [
            `1. Total source current: I_total = ${originalSolution.totalCurrent} A`,
            `2. Equivalent resistance: R_eq = ${originalSolution.totalEquivalentResistance} Ω`,
            '3. Indicators and lamps operate within their calculated conditions.',
          ],
          howToFix: 'The circuit is ready for the experiment; no changes are required.',
        };
      }

      return {
        language: 'tg',
        title: 'Маълумот: Занҷир кушода аст (ҷараён намегузарад)',
        summary: 'Ҳалқаи ноқилҳо канда шудааст ё калид кушода мебошад.',
        whatWentWrong: 'Барои гузаштани ҷараёни электрикӣ ҳалқаи пайваста ва сарбаста аз қутби мусбат то манфӣ лозим аст.',
        physicsLaw: 'Шарати мавҷудияти ҷараёни барқ: мавҷудияти зарраҳои барқанок ва майдони сарбастаи барқӣ.',
        formulaSteps: [
          '1. Муқовимати фосилаи ҳавоӣ: R → ∞',
          '2. Ҷараён: I = U / ∞ = 0 Ампер',
          '3. Барои кор кардани лампа ё муҳаррик занҷир бояд васл карда шавад.',
        ],
        howToFix: 'Калидро пӯшед ё сими кандашударо васл намоед.',
      };
    }

    return {
      language: 'ru',
      title: 'Цепь разомкнута: электрический ток не течёт',
      summary: 'В цепи обнаружен обрыв или выключенный рубильник / ключ.',
      whatWentWrong: 'Электроны не могут перемещаться, так как проводящий путь от источника обратно к источнику разорван.',
      physicsLaw: 'Условие протекания постоянного тока: наличие замкнутой цепи проводников.',
      formulaSteps: [
        '1. Сопротивление воздушного зазора или разомкнутого ключа: R_обрыва → ∞',
        '2. Сила тока: I = U / R = 0 А',
        '3. Напряжение источника присутствует на зажимах ключа, но ток через нагрузку не идёт.',
      ],
      howToFix: 'Замкните выключатель (ключ) или восстановите целостность соединительных проводов.',
    };
  }

  // Case 4: Reverse Biased LED
  if (warnings.some((w) => w.code === 'LED_REVERSE_BIAS')) {
    if (isTg) {
      return {
        language: 'tg',
        title: 'Қутбнокии нодуруст: Диод баръакс пайваст шудааст',
        summary: 'Диод танҳо дар як самт (аз анод ба катод) ҷараён мегузаронад.',
        whatWentWrong: 'Аноди диод ба қутби манфӣ пайваст шудааст, бинобар ин гузариши p-n баста шудааст.',
        physicsLaw: 'Хусусияти яктарафа гузаронандагии пайвасти электронӣ-ковокии (p-n) нимноқилҳо.',
        formulaSteps: [
          '1. Шиддати баръакс: U < 0',
          '2. Муқовимати баръакс: R_баръакс ≈ 10 МегаОм',
          '3. Диод фурӯзон намешавад, зеро ҷараёни мустақим вуҷуд надорад.',
        ],
        howToFix: 'Пояҳои диодро иваз кунед: анод (пояи дарозтар) ба мусбат, катод ба манфӣ.',
      };
    }

    return {
      language: 'ru',
      title: 'Неверная полярность: Светодиод включён в обратном направлении',
      summary: 'Светодиод обладает односторонней проводимостью и заперт при обратном включении.',
      whatWentWrong: 'Анод подключён к отрицательному полюсу, а катод к положительному — p-n переход заперт.',
      physicsLaw: 'Вентильное свойство полупроводникового p-n перехода.',
      formulaSteps: [
        '1. Обратное напряжение запирает носители заряда',
        '2. Сопротивление запертого перехода превышает миллионы Ом',
        '3. Ток не идёт (I ≈ 0), диод не светится. При высоком обратном напряжении возможен пробой.',
      ],
      howToFix: 'Поменяйте выводы светодиода местами: анод (длинную ножку) подключите к плюсу через резистор.',
    };
  }

  // Default: Perfect working circuit!
  if (isTg) {
    return {
      language: 'tg',
      title: 'Офарин! Занҷир комилан дуруст ва бехатар ҷамъ карда шудааст',
      summary: 'Ҳамаи унсурҳо дуруст пайваст шудаанд ва параметрҳои барқӣ дар ҳудуди меъёр мебошанд.',
      whatWentWrong: 'Ҳеҷ гуна хатогӣ ё норасоӣ ошкор нашуд.',
      physicsLaw: 'Қонунҳои Ом ва Кирхгоф барои занҷирҳои мураккаб.',
      formulaSteps: [
        `1. Ҷараёни умумии занҷир: I = ${originalSolution.totalCurrent} А`,
        `2. Муқовимати эквивалентӣ: R_экв = ${originalSolution.totalEquivalentResistance} Ом`,
        '3. Энергияи барқ самаранок ва бехатар сарф мешавад.',
      ],
      howToFix: 'Занҷир ба кор омода аст! Шумо метавонед таҷрибаро идома диҳед.',
    };
  }

  return {
    language: 'ru',
    title: 'Отлично! Электрическая цепь собрана грамотно и безопасно',
    summary: 'Все компоненты согласованы, токи находятся в номинальных пределах, перегрузок нет.',
    whatWentWrong: 'Ошибок в топологии цепи не обнаружено.',
    physicsLaw: 'Законы Ома и Кирхгофа выполняются с абсолютной точностью.',
    formulaSteps: [
      `1. Полный ток от источника: I_общ = ${originalSolution.totalCurrent} А`,
      `2. Эквивалентное сопротивление цепи: R_экв = ${originalSolution.totalEquivalentResistance} Ом`,
      '3. Все индикаторы и лампы светятся в расчетном режиме.',
    ],
    howToFix: 'Цепь функционирует штатно, модификации не требуются.',
  };
}

/**
 * Executes the complete 7-step Photo-to-Circuit Lab Agent pipeline:
 * (1) Perceive -> (2) Netlist -> (3) Solve MNA -> (4) Diagnose -> (5) Propose Fix -> (6) Re-verify -> (7) Explain
 */
export class AgentInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentInputError';
  }
}

export async function runPhotoToCircuitAgent(req: AgentRequest): Promise<AgentRunResult> {
  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const steps: AgentPipelineStep[] = [];
  const language = req.language || 'ru';

  // Step 1 & 2: Perceive & Netlist
  let netlist: NetlistCircuit;
  let modelUsed = 'Preset Fixture';

  if (req.customNetlist) {
    const validated = validateNetlist(req.customNetlist);
    if (!validated.success || !validated.data) {
      throw new AgentInputError(`Invalid customNetlist: ${validated.error}`);
    }
    netlist = validated.data;
    modelUsed = 'Custom Netlist Input';
    steps.push({
      step: 'perception',
      status: 'success',
      title: localized(language, 'Қабули нақшаи занҷир', 'Получение схемы цепи', 'Circuit received'),
      description: localized(language, 'Нақша мустақиман қабул карда шуд', 'Схема получена из интерфейса', 'Circuit received from the interface'),
      timestamp: Date.now(),
      data: {componentsCount: netlist.components.length},
    });
  } else if (req.presetId && PRESET_CIRCUITS[req.presetId]) {
    netlist = PRESET_CIRCUITS[req.presetId].netlist;
    modelUsed = `Preset: ${PRESET_CIRCUITS[req.presetId].name}`;
    steps.push({
      step: 'perception',
      status: 'success',
      title: localized(language, 'Боргирии намунаи таҷрибавӣ', 'Загрузка тестового сценария', 'Loading test scenario'),
      description: `${modelUsed}`,
      timestamp: Date.now(),
      data: {presetId: req.presetId, componentsCount: netlist.components.length},
    });
  } else if (req.imageBase64) {
    const perceptionResult = await perceiveCircuitPhoto(req.imageBase64, undefined, {language});
    netlist = perceptionResult.netlist;
    modelUsed = perceptionResult.modelUsed;
    const isTruncated = Boolean(perceptionResult.truncatedFallbackTriggered);
    const isNegative = netlist.isCircuit === false || netlist.components.length === 0;

    steps.push({
      step: 'perception',
      status: isTruncated ? 'warning' : isNegative ? 'warning' : 'success',
      title: isNegative
        ? localized(language, 'Занҷири барқӣ ёфт нашуд', 'Цепь не обнаружена', 'No circuit detected')
        : localized(language, 'Шинохти акс бо модели Meta', 'Распознавание фото моделью Meta', 'Photo recognition with Meta model'),
      description: isNegative
        ? t('circuit_agent.not_a_circuit', language)
        : isTruncated
          ? t('circuit_agent.fallback_unread', language)
          : `${modelUsed} — ${netlist.components.length} ${localized(language, 'унсур шинохта шуд', 'компонентов распознано', 'components recognized')}`,
      timestamp: Date.now(),
      data: {
        modelUsed,
        componentsCount: netlist.components.length,
        isCircuit: !isNegative,
        finishReason: perceptionResult.finishReason,
        truncatedFallbackTriggered: perceptionResult.truncatedFallbackTriggered,
        userMessage: perceptionResult.userMessage,
      },
    });
  } else if (req.presetId) {
    throw new AgentInputError(`Unknown presetId: ${req.presetId}`);
  } else {
    // Never silently fall back to a demo circuit: the caller must say what to verify.
    throw new AgentInputError('Provide customNetlist, imageBase64 or a valid presetId');
  }

  // Universal non-circuit guard (polite guidance, never invent components)
  if (netlist.isCircuit === false || netlist.components.length === 0) {
    const nonCircuitExplanation = {
      language,
      title: localized(language, 'Дар ин акс занҷири барқӣ ёфт нашуд', 'На фото не обнаружена электрическая цепь', 'No electrical circuit was detected in this photo'),
      summary: t('circuit_agent.not_a_circuit', language),
      whatWentWrong: localized(language, 'Дар акс формулаҳо, расмҳои оптика ё механика дида мешаванд, вале унсурҳои занҷири барқӣ (батарея, резистор, лампа) нестанд.', 'Фотография содержит формулы или схемы из других разделов физики (механика, оптика), но не содержит элементов электрической цепи.', 'The photo contains formulas or diagrams from another physics area, but no electrical circuit components.'),
      physicsLaw: localized(language, 'Қонуни ҳифзи энергия ва занҷирҳои барқӣ', 'Законы электродинамики и электрических цепей', 'Laws of electrodynamics and electrical circuits'),
      formulaSteps: [
        localized(language, '1. Барои таҳлили занҷир манбаи ҷараён (батарея) лозим аст.', '1. Для расчёта цепи необходим источник ЭДС (батарея).', '1. A source (battery) is required to analyze the circuit.'),
        localized(language, '2. Истеъмолкунанда (лампа ё резистор) бояд васл шавад.', '2. Должна присутствовать нагрузка (лампа или резистор).', '2. A load such as a lamp or resistor must be connected.'),
        localized(language, '3. Ноқилҳо бояд ҳалқаи сарбастаро ташкил кунанд.', '3. Проводники должны образовывать замкнутый контур.', '3. Conductors must form a closed loop.'),
      ],
      howToFix: localized(language, 'Акси равшани занҷири барқиро бор кунед ё дар мизи корӣ худатон занҷирро созед.', 'Пожалуйста, сфотографируйте электрическую цепь или соберите её вручную на верстаке.', 'Upload a clear circuit photo or build the circuit manually on the workbench.'),
    };

    return {
      runId,
      modelUsed,
      steps,
      originalNetlist: netlist,
      originalSolution: {
        isClosedCircuit: false,
        hasShortCircuit: false,
        totalCurrent: 0,
        totalEquivalentResistance: 0,
        elementResults: {},
        nodeVoltages: {},
        warnings: [],
        status: 'open_circuit',
      },
      diagnosedIssues: [],
      hasMistake: false,
      explanation: nonCircuitExplanation,
    };
  }

  steps.push({
    step: 'netlist',
    status: 'success',
    title: localized(language, 'Ташаккули Netlist (Zod)', 'Формирование нетлиста цепи (Zod)', 'Building netlist (Zod)'),
    description: `${netlist.components.length} ${localized(language, 'унсур', 'компонентов', 'components')}, ${localized(language, 'замини истинод', 'опорная земля', 'reference ground')}: ${netlist.groundNode || '0'}`,
    timestamp: Date.now(),
    data: netlist,
  });

  // Step 3: Solve original circuit deterministically via MNA
  const mnaCircuit = convertNetlistToMNACircuit(netlist);
  const originalSolution = solveCircuit(mnaCircuit);

  steps.push({
    step: 'solve_original',
    status: originalSolution.warnings.length > 0 ? 'warning' : 'success',
    title: localized(language, 'Ҳисоби математикии MNA', 'Детерминированный ММА расчет', 'Deterministic MNA calculation'),
    description:
      originalSolution.warnings.length > 0
        ? `${originalSolution.warnings.length} ${localized(language, 'хато ошкор шуд', 'аномалий обнаружено', 'anomalies detected')}`
        : `${localized(language, 'Занҷир бехатар аст', 'Цепь в штатном режиме', 'Circuit is operating normally')} (I=${originalSolution.totalCurrent}A)`,
    timestamp: Date.now(),
    data: originalSolution,
  });

  // Step 4: Diagnosis
  const hasMistake = originalSolution.warnings.length > 0;
  steps.push({
    step: 'diagnosis',
    status: hasMistake ? 'warning' : 'success',
    title: localized(language, 'Ташхиси хатогиҳо', 'Диагностика физических ошибок', 'Physical error diagnosis'),
    description: hasMistake
      ? originalSolution.warnings.map((w) => w.message).join(' | ')
      : language === 'tg'
        ? 'Ҳамаи параметрҳо дурустанд'
        : localized(language, 'Ҳамаи параметрҳо дурустанд', 'Все физические параметры в норме', 'All physical parameters are within normal range'),
    timestamp: Date.now(),
    data: originalSolution.warnings,
  });

  // Step 5 & 6: Propose Fix & Re-Verify
  let proposedFixNetlist: NetlistCircuit | undefined;
  let fixedSolution: MNASolution | undefined;

  if (hasMistake) {
    proposedFixNetlist = proposeCircuitFix(netlist, originalSolution);
    const fixedMnaCircuit = convertNetlistToMNACircuit(proposedFixNetlist);
    fixedSolution = solveCircuit(fixedMnaCircuit);

    steps.push({
      step: 'propose_fix',
      status: 'success',
      title: localized(language, 'Пешниҳоди ислоҳот', 'Синтез топологического исправления', 'Proposed circuit fix'),
      description:
        language === 'tg'
          ? 'Топологияи нав бо муқовимати муҳофизатӣ ташаккул ёфт'
          : 'Сформирована исправленная топология с добавлением защитного элемента',
      timestamp: Date.now(),
      data: proposedFixNetlist,
    });

    steps.push({
      step: 'solve_fixed',
      status: fixedSolution.status === 'ok' ? 'success' : 'warning',
      title: localized(language, 'Санҷиши такрории ҳал', 'Повторная верификация исправленной цепи', 'Re-verify corrected circuit'),
      description:
        fixedSolution.status === 'ok'
          ? `${localized(language, 'Занҷири ислоҳшуда санҷида шуд', 'Исправленная цепь верифицирована', 'Corrected circuit verified')}: I=${fixedSolution.totalCurrent}A, ${localized(language, 'ҳолат OK', 'статус OK', 'status OK')}`
          : 'Остались нерешённые предупреждения',
      timestamp: Date.now(),
      data: fixedSolution,
    });
  }

  // Step 7: Explain like a teacher in a school without a lab
  const explanation = generateTeacherExplanation(
    netlist,
    originalSolution,
    proposedFixNetlist,
    fixedSolution,
    language,
  );

  steps.push({
    step: 'explanation',
    status: 'success',
    title: localized(language, 'Тавзеҳи омӯзгор', 'Педагогическое объяснение', 'Teacher explanation'),
    description: explanation.title,
    timestamp: Date.now(),
    data: explanation,
  });

  return {
    runId,
    modelUsed,
    steps,
    originalNetlist: netlist,
    originalSolution,
    diagnosedIssues: originalSolution.warnings,
    hasMistake,
    proposedFixNetlist,
    fixedSolution,
    explanation,
  };
}
