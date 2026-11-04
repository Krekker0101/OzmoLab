/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Скрипт прогона оценочных тестов ИИ-наставника (Eval Suite)
 */

import {evalScenarios, EvalScenario} from './scenarios.ts';
import {streamTutorReply} from '../tutorService.ts';

export interface EvalResult {
  scenarioId: string;
  name: string;
  passed: boolean;
  languageCorrect: boolean;
  noHallucinatedNumbers: boolean;
  socraticCompliant: boolean;
  details: string;
  outputText: string;
}

/**
 * Проверка соответствия языку (таджикский / русский)
 */
function verifyLanguage(text: string, targetLang: 'tg' | 'ru'): boolean {
  const lower = text.toLowerCase();
  if (targetLang === 'tg') {
    // Таджикские маркеры: буквы ӣ, ӯ, ҳ, ҷ, қ, ғ или характерные слова
    const tgChars = /[ӣӯҳҷқғ]/i;
    const tgWords = [
      'ва',
      'ки',
      'дар',
      'барои',
      'занҷир',
      'барқ',
      'шумо',
      'аст',
      'кардан',
      'бояд',
      'лутфан',
      'ман',
      'миз',
      'холӣ',
      'кӯтоҳ',
    ];
    return tgChars.test(text) || tgWords.some((w) => lower.includes(w));
  } else {
    // Русский: текст на кириллице без специфических таджикских букв
    const hasRussianLetters = /[а-яё]/i.test(text);
    const hasTajikSpecific = /[ӣӯҳҷқғ]/i.test(text);
    return hasRussianLetters && !hasTajikSpecific;
  }
}

/**
 * Проверка отсутствия выдуманных чисел
 */
function verifyNoHallucinatedNumbers(text: string, allowedNumbers?: number[]): {valid: boolean; found: number[]} {
  // Находим все числа в тексте
  const matches = text.match(/\b\d+(\.\d+)?\b/g);
  if (!matches || matches.length === 0) {
    return {valid: true, found: []};
  }

  const numbers = matches.map(Number);
  if (!allowedNumbers) {
    return {valid: true, found: numbers};
  }

  // Общепринятые допустимые служебные числа (например, 1 шаг, 3-5 предложений, 8-11 классы)
  const universalAllowed = [1, 2, 3, 4, 5, 8, 9, 10, 11, 0];
  const combinedAllowed = new Set([...allowedNumbers, ...universalAllowed]);

  const suspicious = numbers.filter((num) => !combinedAllowed.has(num));
  return {
    valid: suspicious.length === 0,
    found: numbers,
  };
}

/**
 * Проверка соблюдения сократовского метода (ответ не должен вываливать полное длинное готовое решение)
 */
function verifySocratic(text: string): boolean {
  // Сократовский ответ обычно содержит вопросительный знак или краткое побуждение к одному действию,
  // и не содержит подробного многошагового руководства (например "1. Сделай это. 2. Сделай то. 3. Потом это. 4. И наконец...")
  const sentences = text.split(/[.?!]/).filter((s) => s.trim().length > 0);
  const isShort = sentences.length <= 6;
  const hasMultipleSequentialSteps =
    text.includes('1.') && text.includes('2.') && text.includes('3.') && text.includes('4.');

  return isShort && !hasMultipleSequentialSteps;
}

/**
 * Запуск одного сценария
 */
export async function runScenario(scenario: EvalScenario): Promise<EvalResult> {
  const chunks: string[] = [];
  await streamTutorReply(scenario.request, (chunk) => {
    chunks.push(chunk);
  });
  const outputText = chunks.join('');

  // 1. Проверка языка
  const languageCorrect = verifyLanguage(outputText, scenario.expected.language);

  // 2. Проверка выдуманных чисел
  const numberCheck = verifyNoHallucinatedNumbers(outputText, scenario.expected.allowedNumbers);
  const noHallucinatedNumbers = numberCheck.valid;

  // 3. Проверка сократовского метода
  const socraticCompliant = scenario.expected.mustBeSocratic ? verifySocratic(outputText) : true;

  // 4. Проверка обязательных ключевых слов
  const lowerOutput = outputText.toLowerCase();
  const hasRequiredKeywords = scenario.expected.requiredKeywords.every((kw) =>
    lowerOutput.includes(kw.toLowerCase())
  );

  // 5. Проверка запрещенных ключевых слов
  const hasNoForbiddenKeywords = scenario.expected.forbiddenKeywords
    ? !scenario.expected.forbiddenKeywords.some((kw) => lowerOutput.includes(kw.toLowerCase()))
    : true;

  const passed =
    languageCorrect &&
    noHallucinatedNumbers &&
    socraticCompliant &&
    hasRequiredKeywords &&
    hasNoForbiddenKeywords;

  const failureReasons: string[] = [];
  if (!languageCorrect) failureReasons.push('Неверный язык');
  if (!noHallucinatedNumbers) failureReasons.push('Выдуманные числа');
  if (!socraticCompliant) failureReasons.push('Нарушение сократовского метода');
  if (!hasRequiredKeywords) failureReasons.push('Отсутствуют ключевые концепты');
  if (!hasNoForbiddenKeywords) failureReasons.push('Содержит запрещенные слова');

  return {
    scenarioId: scenario.id,
    name: scenario.name,
    passed,
    languageCorrect,
    noHallucinatedNumbers,
    socraticCompliant,
    details: failureReasons.length > 0 ? failureReasons.join(', ') : 'OK',
    outputText,
  };
}

/**
 * Запуск всего набора тестов
 */
export async function runAllEvals(): Promise<EvalResult[]> {
  process.env.EVAL_FAST = 'true';
  console.log('='.repeat(70));
  console.log('  ОЗМО ЛАБ — ПРОГОН 15 ОЦЕНОЧНЫХ СЦЕНАРИЕВ ДЛЯ ИИ-НАСТАВНИКА');
  console.log('='.repeat(70));

  const results: EvalResult[] = [];
  let passCount = 0;

  for (const scenario of evalScenarios) {
    const result = await runScenario(scenario);
    results.push(result);
    if (result.passed) passCount++;

    const statusBadge = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(
      `[${statusBadge}] ${scenario.id.padEnd(32)} | Язык: ${result.languageCorrect ? 'OK' : 'ERR'} | Числа: ${
        result.noHallucinatedNumbers ? 'OK' : 'ERR'
      } | Сократ: ${result.socraticCompliant ? 'OK' : 'ERR'} | ${scenario.name}`
    );
  }

  console.log('-'.repeat(70));
  console.log(`ИТОГ ОЦЕНКИ: ${passCount} из ${evalScenarios.length} сценариев успешно пройдено (${Math.round((passCount / evalScenarios.length) * 100)}%)`);
  console.log('='.repeat(70));

  return results;
}

// Прямой запуск через tsx server/eval/runEval.ts
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('runEval')) {
  runAllEvals()
    .then((results) => {
      const allPassed = results.every((r) => r.passed);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Eval error:', err);
      process.exit(1);
    });
}
