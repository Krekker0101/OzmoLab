/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Модуль синтеза и генерации схем ИИ-Создателем
 * Позволяет ИИ анализировать текстовые запросы ученика и генерировать
 * законченные, физически корректные электрические схемы для 2D и 3D верстака.
 */

import {CircuitComponent, Wire, SynthesizedCircuit} from './types.ts';
export type {SynthesizedCircuit};

/**
 * 1. Простая цепь: Батарея + Ключ + Лампа накаливания
 */
export function generateSimpleCircuit(lang: 'tg' | 'ru' | 'en' = 'ru'): SynthesizedCircuit {
  const isTg = lang === 'tg';
  const isEn = lang === 'en';

  return {
    id: 'synth_simple_lamp',
    title: isTg
      ? 'Занҷири оддӣ бо лампа ва калид'
      : isEn
        ? 'Simple Circuit with Lamp and Switch'
        : 'Простая цепь с лампой и ключом',
    description: isTg
      ? 'Манбаи шиддати 9В, калиди пӯшида ва лампаи тафсони 15 Ом дар пайвасти пайдарпай.'
      : isEn
        ? '9V battery, closed switch, and 15Ω incandescent lamp in series connection.'
        : 'Источник питания 9В, замкнутый ключ и лампа накаливания 15 Ом в последовательном включении.',
    discipline: 'circuits',
    components: [
      {
        id: 'gen_bat_1',
        type: 'battery',
        x: 180,
        y: 200,
        rotation: 0,
        values: {voltage: 9, internalResistance: 0.2},
        state: {},
      },
      {
        id: 'gen_sw_1',
        type: 'switch',
        x: 360,
        y: 120,
        rotation: 0,
        values: {},
        state: {isOpen: false},
      },
      {
        id: 'gen_lamp_1',
        type: 'lamp',
        x: 540,
        y: 200,
        rotation: 0,
        values: {resistance: 15},
        state: {illuminated: true, brightness: 0.8},
      },
    ],
    wires: [
      {
        id: 'gen_w_1',
        from: {componentId: 'gen_bat_1', terminalId: 'pos'},
        to: {componentId: 'gen_sw_1', terminalId: 'term_a'},
      },
      {
        id: 'gen_w_2',
        from: {componentId: 'gen_sw_1', terminalId: 'term_b'},
        to: {componentId: 'gen_lamp_1', terminalId: 'term_a'},
      },
      {
        id: 'gen_w_3',
        from: {componentId: 'gen_lamp_1', terminalId: 'term_b'},
        to: {componentId: 'gen_bat_1', terminalId: 'neg'},
      },
    ],
  };
}

/**
 * 2. Параллельное соединение ламп
 */
export function generateParallelLampsCircuit(lang: 'tg' | 'ru' | 'en' = 'ru'): SynthesizedCircuit {
  const isTg = lang === 'tg';
  const isEn = lang === 'en';

  return {
    id: 'synth_parallel_lamps',
    title: isTg
      ? 'Пайвасти мувозии ду лампа'
      : isEn
        ? 'Parallel Connection of Two Lamps'
        : 'Параллельное соединение двух ламп',
    description: isTg
      ? 'Батареяи 9В, калиди асосӣ ва ду шохаи баробар бо лампаҳои 15 Ом. Ҳар як лампа шиддати пурраи 9В-ро мегирад.'
      : isEn
        ? '9V battery, main switch, and two parallel branches with 15Ω lamps receiving full 9V each.'
        : 'Батарея 9В, общий ключ и две параллельные ветви с лампами 15 Ом. Каждая лампа горит под полным напряжением 9В.',
    discipline: 'circuits',
    components: [
      {
        id: 'gen_bat_1',
        type: 'battery',
        x: 160,
        y: 220,
        rotation: 0,
        values: {voltage: 9, internalResistance: 0.15},
        state: {},
      },
      {
        id: 'gen_sw_1',
        type: 'switch',
        x: 320,
        y: 120,
        rotation: 0,
        values: {},
        state: {isOpen: false},
      },
      {
        id: 'gen_lamp_1',
        type: 'lamp',
        x: 480,
        y: 160,
        rotation: 0,
        values: {resistance: 15},
        state: {illuminated: true, brightness: 0.9},
      },
      {
        id: 'gen_lamp_2',
        type: 'lamp',
        x: 480,
        y: 280,
        rotation: 0,
        values: {resistance: 15},
        state: {illuminated: true, brightness: 0.9},
      },
    ],
    wires: [
      // Батарея (+) -> Ключ
      {
        id: 'gen_w_1',
        from: {componentId: 'gen_bat_1', terminalId: 'pos'},
        to: {componentId: 'gen_sw_1', terminalId: 'term_a'},
      },
      // Ключ -> Лампа 1 (+)
      {
        id: 'gen_w_2',
        from: {componentId: 'gen_sw_1', terminalId: 'term_b'},
        to: {componentId: 'gen_lamp_1', terminalId: 'term_a'},
      },
      // Лампа 1 (+) -> Лампа 2 (+) (Параллельная шина питания)
      {
        id: 'gen_w_3',
        from: {componentId: 'gen_lamp_1', terminalId: 'term_a'},
        to: {componentId: 'gen_lamp_2', terminalId: 'term_a'},
      },
      // Лампа 1 (-) -> Лампа 2 (-) (Параллельная общая шина)
      {
        id: 'gen_w_4',
        from: {componentId: 'gen_lamp_1', terminalId: 'term_b'},
        to: {componentId: 'gen_lamp_2', terminalId: 'term_b'},
      },
      // Лампа 1 (-) -> Батарея (-)
      {
        id: 'gen_w_5',
        from: {componentId: 'gen_lamp_1', terminalId: 'term_b'},
        to: {componentId: 'gen_bat_1', terminalId: 'neg'},
      },
    ],
  };
}

/**
 * 3. Стенд проверки закона Ома (Батарея + Ключ + Амперметр + Резистор + Вольтметр)
 */
export function generateOhmLawBenchCircuit(lang: 'tg' | 'ru' | 'en' = 'ru'): SynthesizedCircuit {
  const isTg = lang === 'tg';
  const isEn = lang === 'en';

  return {
    id: 'synth_ohm_bench',
    title: isTg
      ? 'Стенди санҷиши қонуни Ом (I = U / R)'
      : isEn
        ? "Ohm's Law Verification Bench"
        : 'Стенд проверки закона Ома (I = U / R)',
    description: isTg
      ? 'Амперметр пайдарпай ва волтметр мувозӣ бо резистори 10 Ом пайваст шудаанд. Санҷиши дақиқи муносибати байни U ва I.'
      : isEn
        ? 'Ammeter in series, voltmeter in parallel with 10Ω resistor. Direct verification of I = U / R relationship.'
        : 'Амперметр включён последовательно в цепь, а вольтметр подключён параллельно резистору 10 Ом. Идеальная схема для лабораторной работы по закону Ома.',
    discipline: 'circuits',
    components: [
      {
        id: 'gen_bat_1',
        type: 'battery',
        x: 140,
        y: 220,
        rotation: 0,
        values: {voltage: 9, internalResistance: 0.1},
        state: {},
      },
      {
        id: 'gen_sw_1',
        type: 'switch',
        x: 280,
        y: 120,
        rotation: 0,
        values: {},
        state: {isOpen: false},
      },
      {
        id: 'gen_amm_1',
        type: 'ammeter',
        x: 440,
        y: 120,
        rotation: 0,
        values: {internalResistance: 0.01},
        state: {reading: 0.89},
      },
      {
        id: 'gen_res_1',
        type: 'resistor',
        x: 580,
        y: 220,
        rotation: 0,
        values: {resistance: 10},
        state: {},
      },
      {
        id: 'gen_vm_1',
        type: 'voltmeter',
        x: 580,
        y: 350,
        rotation: 0,
        values: {internalResistance: 100000},
        state: {reading: 8.91},
      },
    ],
    wires: [
      // Батарея (+) -> Ключ
      {
        id: 'gen_w_1',
        from: {componentId: 'gen_bat_1', terminalId: 'pos'},
        to: {componentId: 'gen_sw_1', terminalId: 'term_a'},
      },
      // Ключ -> Амперметр
      {
        id: 'gen_w_2',
        from: {componentId: 'gen_sw_1', terminalId: 'term_b'},
        to: {componentId: 'gen_amm_1', terminalId: 'term_a'},
      },
      // Амперметр -> Резистор
      {
        id: 'gen_w_3',
        from: {componentId: 'gen_amm_1', terminalId: 'term_b'},
        to: {componentId: 'gen_res_1', terminalId: 'term_a'},
      },
      // Резистор -> Батарея (-)
      {
        id: 'gen_w_4',
        from: {componentId: 'gen_res_1', terminalId: 'term_b'},
        to: {componentId: 'gen_bat_1', terminalId: 'neg'},
      },
      // Вольтметр параллельно к Резистору
      {
        id: 'gen_w_5',
        from: {componentId: 'gen_res_1', terminalId: 'term_a'},
        to: {componentId: 'gen_vm_1', terminalId: 'term_a'},
      },
      {
        id: 'gen_w_6',
        from: {componentId: 'gen_res_1', terminalId: 'term_b'},
        to: {componentId: 'gen_vm_1', terminalId: 'term_b'},
      },
    ],
  };
}

/**
 * 4. Делитель напряжения
 */
export function generateVoltageDividerCircuit(lang: 'tg' | 'ru' | 'en' = 'ru'): SynthesizedCircuit {
  const isTg = lang === 'tg';
  const isEn = lang === 'en';

  return {
    id: 'synth_voltage_divider',
    title: isTg
      ? 'Тақсимкунандаи шиддат бо ду резистор'
      : isEn
        ? 'Resistive Voltage Divider'
        : 'Резистивный делитель напряжения',
    description: isTg
      ? 'Шиддати 12В бо ду резистори якхелаи 20 Ом тақсим мешавад. Волтметр шиддати баромади 6.00 В-ро нишон медиҳад.'
      : isEn
        ? '12V source divided evenly across two 20Ω resistors. Output voltmeter reads exactly 6.00V.'
        : 'Источник 12В делится пополам двумя резисторами по 20 Ом. Вольтметр снимает выходное напряжение 6.00 В.',
    discipline: 'circuits',
    components: [
      {
        id: 'gen_bat_1',
        type: 'battery',
        x: 160,
        y: 240,
        rotation: 0,
        values: {voltage: 12, internalResistance: 0.1},
        state: {},
      },
      {
        id: 'gen_sw_1',
        type: 'switch',
        x: 300,
        y: 120,
        rotation: 0,
        values: {},
        state: {isOpen: false},
      },
      {
        id: 'gen_res_1',
        type: 'resistor',
        x: 460,
        y: 120,
        rotation: 0,
        values: {resistance: 20},
        state: {},
      },
      {
        id: 'gen_res_2',
        type: 'resistor',
        x: 460,
        y: 260,
        rotation: 0,
        values: {resistance: 20},
        state: {},
      },
      {
        id: 'gen_vm_1',
        type: 'voltmeter',
        x: 620,
        y: 260,
        rotation: 0,
        values: {internalResistance: 100000},
        state: {reading: 6.0},
      },
    ],
    wires: [
      {
        id: 'gen_w_1',
        from: {componentId: 'gen_bat_1', terminalId: 'pos'},
        to: {componentId: 'gen_sw_1', terminalId: 'term_a'},
      },
      {
        id: 'gen_w_2',
        from: {componentId: 'gen_sw_1', terminalId: 'term_b'},
        to: {componentId: 'gen_res_1', terminalId: 'term_a'},
      },
      {
        id: 'gen_w_3',
        from: {componentId: 'gen_res_1', terminalId: 'term_b'},
        to: {componentId: 'gen_res_2', terminalId: 'term_a'},
      },
      {
        id: 'gen_w_4',
        from: {componentId: 'gen_res_2', terminalId: 'term_b'},
        to: {componentId: 'gen_bat_1', terminalId: 'neg'},
      },
      {
        id: 'gen_w_5',
        from: {componentId: 'gen_res_2', terminalId: 'term_a'},
        to: {componentId: 'gen_vm_1', terminalId: 'term_a'},
      },
      {
        id: 'gen_w_6',
        from: {componentId: 'gen_res_2', terminalId: 'term_b'},
        to: {componentId: 'gen_vm_1', terminalId: 'term_b'},
      },
    ],
  };
}

/**
 * 5. Реостатная схема с регулировкой яркости
 */
export function generateRheostatCircuit(lang: 'tg' | 'ru' | 'en' = 'ru'): SynthesizedCircuit {
  const isTg = lang === 'tg';
  const isEn = lang === 'en';

  return {
    id: 'synth_rheostat',
    title: isTg
      ? 'Танзими ҷараён бо реостат'
      : isEn
        ? 'Rheostat Current Dimming Circuit'
        : 'Регулировка тока с реостатом',
    description: isTg
      ? 'Реостат, лампа ва амперметр дар пайвасти пайдарпай. Бо гардонидани реостат равшании лампа тағйир меёбад.'
      : isEn
        ? 'Rheostat, lamp, and ammeter in series. Adjusting rheostat resistance controls lamp brightness and current.'
        : 'Реостат, лампа и амперметр последовательно в цепи 9В. Изменение сопротивления реостата плавно меняет яркость лампы.',
    discipline: 'circuits',
    components: [
      {
        id: 'gen_bat_1',
        type: 'battery',
        x: 160,
        y: 220,
        rotation: 0,
        values: {voltage: 9, internalResistance: 0.2},
        state: {},
      },
      {
        id: 'gen_rheo_1',
        type: 'rheostat',
        x: 320,
        y: 120,
        rotation: 0,
        values: {resistance: 25, currentResistance: 15},
        state: {},
      },
      {
        id: 'gen_amm_1',
        type: 'ammeter',
        x: 480,
        y: 120,
        rotation: 0,
        values: {internalResistance: 0.01},
        state: {reading: 0.3},
      },
      {
        id: 'gen_lamp_1',
        type: 'lamp',
        x: 600,
        y: 220,
        rotation: 0,
        values: {resistance: 15},
        state: {illuminated: true, brightness: 0.65},
      },
    ],
    wires: [
      {
        id: 'gen_w_1',
        from: {componentId: 'gen_bat_1', terminalId: 'pos'},
        to: {componentId: 'gen_rheo_1', terminalId: 'term_a'},
      },
      {
        id: 'gen_w_2',
        from: {componentId: 'gen_rheo_1', terminalId: 'term_b'},
        to: {componentId: 'gen_amm_1', terminalId: 'term_a'},
      },
      {
        id: 'gen_w_3',
        from: {componentId: 'gen_amm_1', terminalId: 'term_b'},
        to: {componentId: 'gen_lamp_1', terminalId: 'term_a'},
      },
      {
        id: 'gen_w_4',
        from: {componentId: 'gen_lamp_1', terminalId: 'term_b'},
        to: {componentId: 'gen_bat_1', terminalId: 'neg'},
      },
    ],
  };
}

/**
 * Определяет намерение пользователя создать/синтезировать схему по тексту сообщения.
 * Требует наличия глагола действия (собери, создай, build, соз и т.д.) и объекта цепи (схема, цепь, стенд, делитель),
 * чтобы не перехватывать сократические вопросы ученика (например, «Как мне проверить закон Ома?»)
 * или запросы готового ответа («Скажи мне сразу готовое решение»).
 */
export function detectCircuitSynthesisIntent(message: string): string | null {
  const text = message.toLowerCase().trim();

  // Если ученик просит готовый ответ или отказывается думать, это обрабатывает сократический наставник
  if (
    text.includes('готовое решение') ||
    text.includes('готовый ответ') ||
    text.includes('не хочу думать') ||
    text.includes('скажи сразу') ||
    text.includes('ҷавоби тайёр') ||
    text.includes('ҷавобро бигӯ') ||
    text.includes('give me the answer') ||
    text.includes('tell me the answer')
  ) {
    return null;
  }

  // Если это вопрос ученика о том, как ему самому что-то проверить или сделать
  if (
    text.includes('как мне ') ||
    text.includes('как нам ') ||
    text.includes('чӣ тавр ') ||
    text.includes('чӣ гуна ') ||
    text.includes('how do i ') ||
    text.includes('how can i ')
  ) {
    return null;
  }

  // Проверяем наличие глагола сборки/генерации
  const hasBuildVerb =
    text.includes('собер') || // собери, собрать
    text.includes('создай') ||
    text.includes('создать') ||
    text.includes('сделай') ||
    text.includes('построй') ||
    text.includes('вылож') ||
    text.includes('сгенерир') ||
    text.includes('составь') ||
    text.includes('соз') || // соз, бисоз, сохтан (TG)
    text.includes('сохтан') ||
    text.includes('тарҳрезӣ') ||
    text.includes('build') ||
    text.includes('create') ||
    text.includes('generate') ||
    text.includes('assemble') ||
    text.includes('synthesize') ||
    text.includes('connect') ||
    text.includes('dimming circuit') ||
    text.includes('ии-создател') ||
    text.includes('генератор схем') ||
    text.includes('генерация схем');

  if (!hasBuildVerb) {
    return null;
  }

  // Проверяем наличие объекта цепи
  const hasCircuitTarget =
    text.includes('схем') ||
    text.includes('цеп') ||
    text.includes('стенд') ||
    text.includes('делител') ||
    text.includes('реостат') ||
    text.includes('занҷир') ||
    text.includes('тақсимкунанда') ||
    text.includes('пайваст') ||
    text.includes('circuit') ||
    text.includes('divider') ||
    text.includes('dimming') ||
    text.includes('ламп') ||
    text.includes('lamp') ||
    text.includes('резистор') ||
    text.includes('resistor') ||
    text.includes('ammeter') ||
    text.includes('амперметр');

  if (!hasCircuitTarget) {
    return null;
  }

  // 1. Делитель напряжения
  if (
    text.includes('делител') ||
    text.includes('divider') ||
    text.includes('тақсимкунанда')
  ) {
    return 'voltage_divider';
  }

  // 2. Стенд закона Ома
  if (
    text.includes('закон ома') ||
    text.includes('қонуни ом') ||
    text.includes('закона ома') ||
    text.includes('стенд') ||
    ((text.includes('амперметр') || text.includes('ammeter')) &&
      (text.includes('вольтметр') || text.includes('voltmeter'))) ||
    text.includes('измерить ток и напряжение')
  ) {
    return 'ohm_bench';
  }

  // 3. Параллельное соединение
  if (
    text.includes('параллел') ||
    text.includes('мувозӣ') ||
    text.includes('parallel') ||
    text.includes('две ламп') ||
    text.includes('2 ламп') ||
    text.includes('ду ламп')
  ) {
    return 'parallel_lamps';
  }

  // 4. Реостат / регулировка
  if (
    text.includes('реостат') ||
    text.includes('rheostat') ||
    text.includes('диммер') ||
    text.includes('dimming') ||
    text.includes('яркост')
  ) {
    return 'rheostat';
  }

  // 5. Простая цепь / общая генерация
  return 'simple_circuit';
}

/**
 * Синтезирует схему по названию шаблона или ключевому слову
 */
export function synthesizeCircuitByKey(key: string, lang: 'tg' | 'ru' | 'en' = 'ru'): SynthesizedCircuit {
  switch (key) {
    case 'parallel_lamps':
      return generateParallelLampsCircuit(lang);
    case 'ohm_bench':
      return generateOhmLawBenchCircuit(lang);
    case 'voltage_divider':
      return generateVoltageDividerCircuit(lang);
    case 'rheostat':
      return generateRheostatCircuit(lang);
    case 'simple_circuit':
    default:
      return generateSimpleCircuit(lang);
  }
}

/**
 * Парсит сгенерированную схему из блока ответа LLM (````circuit ... ````)
 */
export function extractCircuitFromText(text: string): {cleanText: string; circuit: SynthesizedCircuit | null} {
  const circuitBlockRegex = /```(?:circuit|json:circuit)\s*([\s\S]*?)\s*```/i;
  const match = text.match(circuitBlockRegex);

  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed.components) && Array.isArray(parsed.wires)) {
        const cleanText = text.replace(circuitBlockRegex, '').trim();
        return {
          cleanText,
          circuit: {
            id: parsed.id || `synth_${Date.now()}`,
            title: parsed.title || 'Синтезированная схема',
            description: parsed.description || 'Электрическая схема, сгенерированная ИИ-Создателем.',
            discipline: 'circuits',
            components: parsed.components,
            wires: parsed.wires,
          },
        };
      }
    } catch {
      // Игнорируем синтаксическую ошибку JSON и продолжаем
    }
  }

  return {cleanText: text, circuit: null};
}
