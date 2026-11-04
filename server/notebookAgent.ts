/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Notebook Photo Router & Physics Problem Extraction Agent
 * Meta Global AI Developer Hackathon (Indie Developer Track: "Build for Your World")
 */

import {
  NotebookExtractionResult,
  NotebookExtractionResultSchema,
  PhotoClassification,
} from '../shared/schema/notebook.ts';
import {SupportedLanguage, t} from '../shared/i18n.ts';
import {solveCentreOfMass, solveResistanceProblem} from '../shared/solver/physicsSolver.ts';
import {perceiveCircuitPhoto} from './circuitAgent.ts';

function parseJsonFromText(rawText: string): unknown {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose > firstOpen) {
    cleaned = cleaned.substring(firstOpen, lastClose + 1);
  }

  return JSON.parse(cleaned);
}

export async function routeAndExtractNotebookPhoto(
  imageBase64: string,
  options?: {
    language?: SupportedLanguage;
    forcedMaxTokens?: number;
    skipRetry?: boolean;
    customFetch?: typeof fetch;
  },
): Promise<NotebookExtractionResult> {
  const lang: SupportedLanguage = options?.language || 'tg';
  const customFetch = options?.customFetch || fetch;

  const basetenKey = process.env.BASETEN_API_KEY;
  const modelId = process.env.BASETEN_MODEL_ID || 'meta-models/muse-spark-open-1026';
  const apiUrl = process.env.BASETEN_API_URL || 'https://inference.baseten.co/v1';

  // Fallback if no API key is provided and no custom fetch mock was passed
  if (!basetenKey && !options?.customFetch) {
    return {
      classification: {
        category: 'not_readable',
        confidence: 0,
        detectedLanguage: 'en',
        summary: 'No vision API key configured.',
      },
      userGuidance: t('notebook.unread_fallback', lang),
      needsConfirmation: true,
      isConfident: false,
    };
  }

  const systemPrompt = `You are an educational physics notebook router and problem extractor for students.
Your task is to analyze the provided notebook image or diagram and return ONLY a valid JSON object matching this schema:
{
  "classification": {
    "category": "circuit" | "supported_problem" | "other_notes" | "not_readable",
    "confidence": number between 0 and 1,
    "detectedLanguage": "en" | "tg" | "ru" | "bn" | "mixed" | "other",
    "summary": "Brief 1-sentence description of what is in the image",
    "problemType": "centre_of_mass" | "resistance_circuit" | null
  },
  "centreOfMass": { // ONLY if category is "supported_problem" and problemType is "centre_of_mass"
    "dimension": "1D" | "2D",
    "variableSymbol": string (e.g. "d" or "a", or omit if numeric only),
    "items": [
      {
        "id": string (e.g. "m1", "m2"),
        "mass": number (relative coefficient of m, e.g. 1 for m, 2 for 2m, 3 for 3m),
        "x": number (coordinate multiplier along x axis, e.g. 0, 1, 4),
        "y": number (optional coordinate multiplier along y axis, e.g. 0, 1),
        "confidence": number between 0 and 1 (lower if handwriting is messy or ambiguous),
        "rawLabel": string (e.g. "2m at (0,a)")
      }
    ],
    "title": string (optional problem title or question)
  },
  "resistanceProblem": { // ONLY if category is "supported_problem" and problemType is "resistance_circuit"
    "topology": "series" | "parallel" | "mixed",
    "voltage": number (optional source voltage in Volts),
    "resistors": [
      {
        "id": string,
        "resistance": number (in Ohms),
        "confidence": number between 0 and 1
      }
    ],
    "target": "total_resistance" | "current" | "voltage"
  },
  "rawText": "Transcribed handwriting / formula text",
  "isConfident": boolean (true ONLY if handwriting and numbers are clear and unambiguous)
}

RULES:
1. "circuit": Use if the photo is primarily an electrical circuit schematic, breadboard, battery, lamp, resistor connection diagram.
2. "supported_problem": ONLY use if the page contains a solvable problem for:
   (a) Centre of mass of point masses in 1D or 2D (must extract masses and coordinates).
   (b) Numeric Ohm's law or series/parallel resistance.
   If multiple problems exist on the page, extract the first clear one or the one marked "Prob".
3. "other_notes": If the image has general physics notes, theory, derivations (e.g. mechanics forces, optics rays, essay text) without a discrete solvable point-mass or circuit problem. NEVER invent dummy numbers or point masses!
4. "not_readable": If blurry, cut off, or illegible.
5. If handwriting is mixed-language or ambiguous, set "isConfident": false and set item confidence < 0.6.
6. Keep reasoning concise (under 80 words) and output valid compact JSON only.`;

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imageUrl = `data:image/jpeg;base64,${cleanBase64}`;

  const initialMaxTokens = options?.forcedMaxTokens ?? 3800;
  const requestBody = {
    model: modelId,
    messages: [
      {role: 'system', content: systemPrompt},
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze and route this notebook page. Extract supported physics problem if present as compact JSON.',
          },
          {type: 'image_url', image_url: {url: imageUrl}},
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: initialMaxTokens,
  };

  const startTime = Date.now();
  let retried = false;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  try {
    const response = await customFetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${basetenKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Baseten HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    const choice = json.choices?.[0];
    let finishReason = choice?.finish_reason || 'stop';
    totalPromptTokens += json.usage?.prompt_tokens || 0;
    totalCompletionTokens += json.usage?.completion_tokens || 0;

    let content = choice?.message?.content || choice?.message?.reasoning_content;

    // Retry if truncated before completing JSON
    if (
      finishReason === 'length' &&
      (!content || content.trim().length === 0 || !content.includes('}')) &&
      !options?.skipRetry
    ) {
      retried = true;
      const retryResponse = await customFetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${basetenKey}`,
        },
        body: JSON.stringify({
          ...requestBody,
          max_tokens: 4500,
        }),
      });

      if (retryResponse.ok) {
        const retryJson = await retryResponse.json();
        const retryChoice = retryJson.choices?.[0];
        finishReason = retryChoice?.finish_reason || 'stop';
        totalPromptTokens += retryJson.usage?.prompt_tokens || 0;
        totalCompletionTokens += retryJson.usage?.completion_tokens || 0;
        content = retryChoice?.message?.content || retryChoice?.message?.reasoning_content;
      }
    }

    if (!content || finishReason === 'length' && !content.includes('}')) {
      return {
        classification: {
          category: 'not_readable',
          confidence: 0.2,
          detectedLanguage: 'other',
          summary: 'Response was truncated due to token limits.',
        },
        userGuidance: t('notebook.unread_fallback', lang),
        needsConfirmation: true,
        isConfident: false,
        modelUsed: `Baseten (${modelId})`,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        latencyMs: Date.now() - startTime,
        retried,
      };
    }

    const parsed = parseJsonFromText(content);
    const validated = NotebookExtractionResultSchema.safeParse(parsed);

    if (validated.success) {
      const data = validated.data;

      // Localized guidance message
      let guidance = '';
      if (data.classification.category === 'circuit') {
        guidance = lang === 'tg'
          ? 'Схемаи занҷири барқӣ муайян карда шуд. Ба таҳлили MNA равона мешавад.'
          : lang === 'ru'
            ? 'Обнаружена электрическая схема. Перенаправляем на MNA-верификацию цепи.'
            : 'Electrical circuit detected. Routing to MNA circuit verifier.';
      } else if (data.classification.category === 'supported_problem') {
        guidance = lang === 'tg'
          ? 'Масъалаи физикӣ муайян шуд. Лутфан, ададҳоро санҷед ва тасдиқ кунед.'
          : lang === 'ru'
            ? 'Распознана учебная задача. Проверьте числовые параметры перед расчётом.'
            : 'Physics problem recognized. Please confirm or adjust parameters before solving.';
      } else if (data.classification.category === 'other_notes') {
        guidance = lang === 'tg'
          ? 'Дар ин саҳифа қайдҳои назариявӣ ё формулаҳо ҳастанд, вале масъалаи мушаххаси маркази масса ё занҷир ёфт нашуд.'
          : lang === 'ru'
            ? 'На странице распознаны конспекты/формулы, но конкретной задачи на центр масс или цепь не обнаружено.'
            : 'General lecture notes or formulas detected, but no supported numerical problem found.';
      } else {
        guidance = t('notebook.unread_fallback', lang);
      }

      return {
        ...data,
        userGuidance: guidance,
        modelUsed: `Baseten (${modelId})`,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        latencyMs: Date.now() - startTime,
        retried,
      };
    } else {
      // Partially valid or category extracted
      const rawCat = (parsed as any)?.classification?.category || 'other_notes';
      const cat = ['circuit', 'supported_problem', 'other_notes', 'not_readable'].includes(rawCat)
        ? rawCat
        : 'other_notes';

      return {
        classification: {
          category: cat,
          confidence: 0.5,
          detectedLanguage: 'other',
          summary: 'Partial extraction or messy handwriting.',
        },
        userGuidance: t('notebook.messy_handwriting_hint', lang),
        needsConfirmation: true,
        isConfident: false,
        modelUsed: `Baseten (${modelId})`,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        latencyMs: Date.now() - startTime,
        retried,
      };
    }
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || String(err);
    return {
      classification: {
        category: 'not_readable',
        confidence: 0,
        detectedLanguage: 'other',
        summary: `Error during routing: ${errorMsg}`,
      },
      userGuidance: t('notebook.unread_fallback', lang),
      needsConfirmation: true,
      isConfident: false,
      latencyMs: Date.now() - startTime,
      retried,
    };
  }
}
