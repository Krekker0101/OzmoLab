/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Сервис взаимодействия с LLM (Gemini SDK) и потоковой трансляции SSE
 */

import {buildTutorSystemPrompt} from './prompts/tutorSystemPrompt.ts';
import type {ValidatedTutorRequest} from './schemas/tutorSchema.ts';
import offlineHints from '../shared/offlineHints.json';
import {
  detectCircuitSynthesisIntent,
  synthesizeCircuitByKey,
} from '../shared/circuitSynthesizer.ts';

interface OfflineHintStructure {
  SHORT_CIRCUIT: Record<string, string>;
  OPEN_CIRCUIT: Record<string, string>;
  EMPTY_CIRCUIT: Record<string, string>;
  CIRCUIT_OK: Record<string, string>;
  HINT_BATTERY_LAMP: Record<string, string>;
  AMMETER_INCORRECT: Record<string, string>;
  VOLTMETER_INCORRECT: Record<string, string>;
  OFF_TOPIC: Record<string, string>;
}

const hints = offlineHints as unknown as OfflineHintStructure;

/**
 * Проверка на попытку выхода за пределы темы или извлечения системного промпта
 */
export function checkSafetyAndGuardrails(message: string, language: 'tg' | 'ru'): string | null {
  const lower = message.toLowerCase();

  // Попытка извлечения системного промпта
  if (
    lower.includes('system prompt') ||
    lower.includes('промпт') ||
    lower.includes('инструкци') ||
    lower.includes('ignore previous') ||
    lower.includes('пештараро фаромӯш') ||
    lower.includes('дастури система')
  ) {
    return language === 'tg'
      ? 'Ман омӯзгори физикаи Озмо Лаб ҳастам. Дастурҳои дохилии омӯзгор маҳрамона буда, барои таълими фанни физика равона шудаанд. Биёед ба озмоиш баргардем!'
      : 'Я виртуальный наставник по физике Озмо Лаб. Служебные инструкции являются закрытыми и служат для методической помощи. Давайте вернемся к нашей электрической цепи!';
  }

  // Вопросы вне курса физики
  const offTopicKeywords = [
    'торт',
    'пирог',
    'оши палав',
    'палав',
    'рецепт',
    'футбол',
    'криптовалют',
    'биткоин',
    'сиёсат',
    'президент',
    'мусиқӣ',
    'кино',
  ];

  if (offTopicKeywords.some((kw) => lower.includes(kw))) {
    return hints.OFF_TOPIC[language] || hints.OFF_TOPIC.ru;
  }

  return null;
}

/**
 * Генерация локального правила при отсутствии интернета или ключа API
 */
export function generateOfflineTutorReply(payload: ValidatedTutorRequest): string {
  const lang = payload.language;
  const state = payload.state;

  // Проверка на guardrail
  const guardrailReply = checkSafetyAndGuardrails(payload.message, lang);
  if (guardrailReply) {
    return guardrailReply;
  }

  // Проверка на запрос синтеза схемы (ИИ-Создатель)
  const synthIntent = detectCircuitSynthesisIntent(payload.message);
  if (synthIntent) {
    const circuit = synthesizeCircuitByKey(synthIntent, lang);
    const intro =
      lang === 'tg'
        ? `Ман ҳамчун ИИ-Омӯзгор ва Созанда схемаи дархостшударо таҳлил ва тарҳрезӣ кардам: «${circuit.title}»!\n${circuit.description}\n\nТугмаи зерро пахш намоед, то схема ба таври худкор ба мизи кории 2D ва 3D гузошта шавад.`
        : `Я как ИИ-Наставник и Создатель спроектировал запрошенную схему: «${circuit.title}»!\n${circuit.description}\n\nНажмите кнопку ниже, чтобы автоматически выложить готовую схему на 2D и 3D верстак.`;

    return `${intro}\n\n\`\`\`circuit\n${JSON.stringify(circuit, null, 2)}\n\`\`\``;
  }

  // Если это запрос проверки схемы (check_circuit)
  if (payload.actionType === 'check_circuit') {
    if (!state || state.activeComponentsCount === 0) {
      return hints.EMPTY_CIRCUIT[lang];
    }
    if (state.hasHazard) {
      return hints.SHORT_CIRCUIT[lang];
    }
    if (!state.isCircuitComplete) {
      return hints.OPEN_CIRCUIT[lang];
    }
    return hints.CIRCUIT_OK[lang];
  }

  // Если это запрос подсказки (hint)
  if (payload.actionType === 'hint') {
    if (!state || state.activeComponentsCount === 0) {
      return hints.EMPTY_CIRCUIT[lang];
    }
    if (state.hasHazard) {
      return hints.SHORT_CIRCUIT[lang];
    }
    const hasBattery = state.components?.some((c) => c.type === 'battery');
    const hasLamp = state.components?.some((c) => c.type === 'lamp');
    if (hasBattery && !hasLamp) {
      return hints.HINT_BATTERY_LAMP[lang];
    }
    if (!state.isCircuitComplete) {
      return hints.OPEN_CIRCUIT[lang];
    }
    return hints.CIRCUIT_OK[lang];
  }

  // Стандартный чат
  if (state?.hasHazard) {
    return hints.SHORT_CIRCUIT[lang];
  }
  if (state && !state.isCircuitComplete) {
    return hints.OPEN_CIRCUIT[lang];
  }
  if (state && state.isCircuitComplete) {
    return hints.CIRCUIT_OK[lang];
  }

  return lang === 'tg'
    ? 'Салом! Ман омодаам дар васл кардани схема ба шумо кумак кунам. Саволи худро диҳед ё тугмаи «Схемаамро санҷ»-ро пахш намоед.'
    : 'Здравствуйте! Я готов помочь вам с практической работой. Задайте вопрос или нажмите кнопку «Проверь мою схему».';
}

/**
 * Потоковая генерация ответа от LLM (Baseten Muse Spark Open / OpenAI-compatible API)
 * или офлайн-генератора через коллбэк onChunk
 */
export async function streamTutorReply(
  payload: ValidatedTutorRequest,
  onChunk: (chunk: string) => void
): Promise<void> {
  const basetenApiKey = process.env.BASETEN_API_KEY;
  const basetenApiUrl = process.env.BASETEN_API_URL || 'https://inference.baseten.co/v1';
  const basetenModelId = process.env.BASETEN_MODEL_ID || 'meta-models/muse-spark-open-1026';
  const language = payload.language;

  // Проверка guardrail до обращения к LLM
  const guardrailText = checkSafetyAndGuardrails(payload.message, language);
  if (guardrailText) {
    onChunk(guardrailText);
    return;
  }

  // Если запущен режим быстрых тестов (EVAL_FAST) или ключ не задан — отдаём детерминированный ответ
  if (process.env.EVAL_FAST === 'true' || !basetenApiKey) {
    const offlineReply = generateOfflineTutorReply(payload);
    if (process.env.EVAL_FAST === 'true') {
      onChunk(offlineReply);
      return;
    }

    // Имитация потокового вывода короткими фрагментами для реалистичности UI
    const words = offlineReply.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const slice = words.slice(i, i + 3).join(' ') + ' ';
      onChunk(slice);
      await new Promise((r) => setTimeout(r, 30));
    }
    return;
  }

  try {
    const systemPrompt = buildTutorSystemPrompt(language);

    let stateContext = '';
    if (payload.state) {
      stateContext = `\n[ҲОЛАТИ СХЕМА / СОСТОЯНИЕ СХЕМЫ (JSON)]:
- Сводка: ${payload.state.summaryText}
- Замкнута ли цепь: ${payload.state.isCircuitComplete}
- Опасность (короткое замыкание): ${payload.state.hasHazard}
- Количество элементов: ${payload.state.activeComponentsCount}
- Количество соединений: ${payload.state.connectionsCount}
- Компоненты: ${JSON.stringify(payload.state.components)}
- Текущий урок: ${payload.lessonId || 'базовый'}`;
    }

    let userPromptText = payload.message;
    if (payload.actionType === 'check_circuit') {
      userPromptText =
        language === 'tg'
          ? `[АМАЛ: СХЕМААМРО САНҶ]: Лутфан схемаи ҷории маро аз рӯи ҳолати додашуда тафтиш кунед, хатогиро ёбед ва ЯК қадами роҳнамо диҳед.`
          : `[ДЕЙСТВИЕ: ПРОВЕРЬ МОЮ СХЕМУ]: Пожалуйста, оцени текущую схему по объекту состояния, найди нестыковку и задай ОДИН наводящий вопрос.`;
    } else if (payload.actionType === 'hint') {
      userPromptText =
        language === 'tg'
          ? `[АМАЛ: МАСЛИҲАТ]: Ба ман барои қадами ояндаи васлкунии схема як маслиҳати кӯтоҳи суқротӣ диҳед.`
          : `[ДЕЙСТВИЕ: ПОДСКАЗКА]: Дай мне одну короткую сократическую подсказку для следующего шага сборки цепи.`;
    }

    const conversationHistory = (payload.history || []).map((h) => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content,
    }));

    const messages = [
      {role: 'system', content: systemPrompt},
      ...conversationHistory,
      {
        role: 'user',
        content: `${stateContext}\n\nСавол / Запрос: ${userPromptText}`,
      },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${basetenApiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${basetenApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: basetenModelId,
        messages,
        temperature: 0.2,
        max_tokens: 1000,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok || !response.body) {
      throw new Error(`Baseten API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedContent = '';

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, {stream: true});
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta;
            if (delta?.content) {
              accumulatedContent += delta.content;
              onChunk(delta.content);
            }
          } catch {
            // Ignore partial SSE chunks
          }
        }
      }
    }

    // Если модель по какой-то причине не вернула content в стриме
    if (accumulatedContent.trim().length === 0) {
      const fallbackReply = generateOfflineTutorReply(payload);
      onChunk(fallbackReply);
    }
  } catch (error) {
    console.error('[tutorService] Baseten Stream error, falling back to offline mode:', error);
    const offlineReply = generateOfflineTutorReply(payload);
    onChunk(offlineReply);
  }
}
