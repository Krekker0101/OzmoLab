/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб — Тест валидации полноты локализации (i18n completeness test)
 * Проверяет отсутствие сырых ключей во всех лабораториях и компонентах платформы
 */

import {describe, it, expect} from 'vitest';
import {translations, t} from '../../../shared/i18n.ts';
import {LabRegistry} from '../labs/registry.ts';
import '../labs/init.ts';

describe('i18n Localization Integrity & Completeness Check', () => {
  const supportedLangs = ['ru', 'tg'] as const;

  it('contains valid non-empty dictionaries for both ru and tg', () => {
    expect(translations.ru).toBeDefined();
    expect(translations.tg).toBeDefined();
    expect(Object.keys(translations.ru).length).toBeGreaterThan(50);
    expect(Object.keys(translations.tg).length).toBeGreaterThan(50);
  });

  it('verifies that all registered lab components have translations in both languages', () => {
    const allLabs = LabRegistry.getAll();
    expect(allLabs.length).toBeGreaterThanOrEqual(3);

    for (const lab of allLabs) {
      for (const lang of supportedLangs) {
        // Заголовок и описание лаборатории
        expect(t(lab.titleKey, lang)).not.toBe(lab.titleKey);
        expect(t(lab.descriptionKey, lang)).not.toBe(lab.descriptionKey);

        // Компоненты лаборатории
        for (const comp of lab.components) {
          const compName = t(comp.nameKey, lang);
          expect(compName).toBeDefined();
          expect(compName).not.toBe(comp.nameKey);
          expect(compName.length).toBeGreaterThan(0);

          // Терминалы компонента
          for (const term of comp.terminals) {
            const termName = t(term.nameKey, lang);
            expect(termName).toBeDefined();
            expect(termName).not.toBe(term.nameKey);
          }

          // Свойства компонента
          for (const prop of comp.properties) {
            const propName = t(prop.nameKey, lang);
            expect(propName).toBeDefined();
            expect(propName).not.toBe(prop.nameKey);
          }
        }
      }
    }
  });

  it('verifies that all required component keys exist and are distinct', () => {
    const criticalKeys = [
      'component.battery',
      'component.resistor',
      'component.lamp',
      'component.switch',
      'component.ammeter',
      'component.voltmeter',
      'component.laser_source',
      'component.convex_lens',
      'component.optical_screen',
      'component.microscope',
      'component.slide_sample',
      'workbench.btn.load_preset',
      'journal.optics.title',
      'journal.bio.title',
    ];

    for (const key of criticalKeys) {
      expect(translations.ru[key], `Missing ru translation for ${key}`).toBeDefined();
      expect(translations.tg[key], `Missing tg translation for ${key}`).toBeDefined();
      expect(translations.ru[key].length).toBeGreaterThan(0);
      expect(translations.tg[key].length).toBeGreaterThan(0);
    }
  });
});
