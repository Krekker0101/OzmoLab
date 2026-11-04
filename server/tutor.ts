/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Обработчик запросов к ИИ-наставнику (@google/genai)
 */

import {AISummarySnapshot, PedagogyMode, SupportedLanguage} from '../shared/types.ts';
import {
  detectCircuitSynthesisIntent,
  synthesizeCircuitByKey,
} from '../shared/circuitSynthesizer.ts';

export interface TutorChatPayload {
  message: string;
  stateSnapshot?: AISummarySnapshot;
  language: SupportedLanguage;
  pedagogyMode?: PedagogyMode;
  lessonContext?: {
    lessonId: string | null;
    stepIndex: number;
  };
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

function buildSystemPrompt(language: SupportedLanguage, pedagogyMode: PedagogyMode = 'combined'): string {
  const isTg = language === 'tg';

  const pedagogyInstructions =
    pedagogyMode === 'socratic'
      ? isTg
        ? 'УСУЛИ СӮҚРОТӢ: Ҳаргиз ҷавоби тайёрро мустақиман нагӯед. Ба талаба саволҳои роҳнамо диҳед, то худаш хатогиро ёфта, қонуни физикаро дарк кунад.'
        : 'СОКРАТИЧЕСКИЙ МЕТОД: Никогда не давайте готовый ответ сразу. Задавайте наводящие вопросы, чтобы ученик сам нашёл ошибку или сформулировал закон.'
      : pedagogyMode === 'direct'
        ? isTg
          ? 'УСУЛИ МУСТАҚИМ: Ба таври равшан, қадам ба қадам фаҳмонед, ки чӣ тавр схемаро васл кардан ва формулаҳоро истифода бурдан лозим аст.'
          : 'ПРЯМОЙ МЕТОД: Чётко и пошагово объясните, как правильно собрать схему, какие формулы применить и что исправить.'
        : isTg
          ? 'РЕҶАИ ОМЕХТА: Агар хатогии хатарнок (кӯтоҳпайвастшавӣ) бошад, бевосита огоҳ кунед. Дар ҳолатҳои дигар бо саволҳои кӯтоҳ талабаро ба ҷавоб роҳнамоӣ кунед.'
          : 'КОМБИНИРОВАННЫЙ РЕЖИМ: Если есть опасная ситуация (короткое замыкание), сразу прямо предупредите. В исследовательских шагах направляйте вопросами.';

  if (isTg) {
    return `Шумо «Озмо Лаб ИИ» — муаллими меҳрубон, ботаҷриба ва илмии физика ва электротехника барои мактаббачагони Тоҷикистон (синфҳои 7-11) ҳастед.
Муоширатро бо забони тоҷикии тоза, илмӣ ва фаҳмо анҷом диҳед.
${pedagogyInstructions}
Истилоҳоти муҳим: муқовимат (R, Ом), шиддати барқ (U, Волт), шиддати ҷараён (I, Ампер), қонуни Ом (I = U / R), батарея, лампаи тафсон, калид, амперметр, волтметр, кӯтоҳпайвастшавӣ.
Ҳамеша мухтасар (2-4 ҷумла) ва илҳомбахш посух диҳед.`;
  }

  return `Вы «Озмо Лаб ИИ» — доброжелательный, опытный школьный наставник по физике и электротехнике для учащихся школ Таджикистана (7-11 классы).
Общайтесь на грамотном, понятном школьнику русском языке.
${pedagogyInstructions}
Ключевые термины и величины: сопротивление (R, Ом), напряжение (U, В), сила тока (I, А), закон Ома (I = U / R), батарея, лампа накаливания, ключ, амперметр, вольтметр, короткое замыкание.
Отвечайте ёмко, дружелюбно (2-4 предложения) с фокусом на понимание физической сути.`;
}

export async function generateTutorReply(payload: TutorChatPayload): Promise<string> {
  const basetenApiKey = process.env.BASETEN_API_KEY;
  const basetenApiUrl = process.env.BASETEN_API_URL || 'https://inference.baseten.co/v1';
  const basetenModelId = process.env.BASETEN_MODEL_ID || 'meta-models/muse-spark-open-1026';
  const language = payload.language || 'tg';
  const pedagogyMode = payload.pedagogyMode || 'combined';

  // Если ключ не задан или пустой, отдаём детерминированный ответ наставника
  if (!basetenApiKey) {
    return generateLocalRuleBasedReply(payload);
  }

  try {
    const systemPrompt = buildSystemPrompt(language, pedagogyMode);

    let contextData = '';
    if (payload.stateSnapshot) {
      contextData = `\n[ҲОЛАТИ СХЕМА / СОСТОЯНИЕ СХЕМЫ]: ${payload.stateSnapshot.summaryText}
Компоненты: ${JSON.stringify(payload.stateSnapshot.components)}
Замкнута: ${payload.stateSnapshot.isCircuitComplete}, Опасность: ${payload.stateSnapshot.hasHazard}`;
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
        content: `${contextData}\n\nСаволи хонанда / Вопрос ученика: ${payload.message}`,
      },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        max_tokens: 800,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const choice = data.choices?.[0];
      const reply = choice?.message?.content?.trim() || choice?.message?.reasoning_content?.trim();
      if (reply) {
        return reply;
      }
    }
  } catch (error) {
    console.error('[TutorService] Baseten API call error:', error);
  }

  return generateLocalRuleBasedReply(payload);
}

function generateLocalRuleBasedReply(payload: TutorChatPayload): string {
  const isTg = payload.language === 'tg';
  const snapshot = payload.stateSnapshot;

  const synthIntent = detectCircuitSynthesisIntent(payload.message);
  if (synthIntent) {
    const circuit = synthesizeCircuitByKey(synthIntent, payload.language || 'ru');
    const intro = isTg
      ? `Ман ҳамчун ИИ-Омӯзгор ва Созанда схемаи дархостшударо таҳлил ва таҳия намудам: «${circuit.title}»!\n${circuit.description}\n\nТугмаи зерро пахш намоед, то схема ба таври худкор ба мизи кории 2D ва 3D гузошта шавад.`
      : `Я как ИИ-Наставник и Создатель спроектировал запрошенную схему: «${circuit.title}»!\n${circuit.description}\n\nНажмите кнопку ниже, чтобы автоматически выложить готовую схему на 2D и 3D верстак.`;

    return `${intro}\n\n\`\`\`circuit\n${JSON.stringify(circuit, null, 2)}\n\`\`\``;
  }

  if (snapshot?.hasHazard) {
    return isTg
      ? 'Огоҳӣ! Дар схемаи шумо кӯтоҳпайвастшавӣ ба амал омадааст! Ноқилҳо бе муқовимат ба ҳам пайваст шудаанд. Калидро кушоед ва резистор ё лампа илова намоед.'
      : 'Внимание! В вашей схеме обнаружено короткое замыкание. Проводники замкнуты без нагрузки. Разомкните ключ и включите в цепь лампу или резистор.';
  }

  if (snapshot && !snapshot.isCircuitComplete) {
    return isTg
      ? 'Занҷири шумо ҳанӯз сарбаста нест. Барои ҳаракати ҷараёни барқ роҳи пурра лозим аст: аз қутби мусбати батарея (+) ба воситаи калид ва лампа ба қутби манфӣ (-).'
      : 'Ваша цепь ещё не замкнута. Электрическому току нужен непрерывный путь: от положительного полюса батареи (+) через ключ и лампу к отрицательному полюсу (-).';
  }

  if (snapshot && snapshot.isCircuitComplete) {
    return isTg
      ? 'Офарин! Занҷир дуруст васл шудааст ва ҷараён мегузарад. Қонуни Омро тафтиш кунед: I = U / R. Кӯшиш кунед муқовимати резисторро тағйир дода, таъсири онро ба шиддати ҷараён мушоҳида намоед.'
      : 'Отлично! Цепь замкнута правильно, и ток течёт. Обратите внимание на закон Ома: I = U / R. Попробуйте изменить сопротивление резистора и проследите, как изменится показание амперметра.';
  }

  return isTg
    ? 'Салом! Ман омодаам дар озмоишҳо кумак кунам. Унсурҳоро ба мизи корӣ гузоред ва терминалҳоро бо сим пайваст кунед.'
    : 'Здравствуйте! Я готов помочь вам с опытами. Разместите элементы на столе и соедините их выводы проводами.';
}
