/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб — Тесты терминологического глоссария
 */

import {describe, it, expect} from 'vitest';
import glossary from '../glossary.json';
import {t} from '../i18n.ts';

describe('Shared Glossary & i18n Contracts', () => {
  it('should have all essential starter terms defined', () => {
    const requiredIds = [
      'resistance',
      'voltage',
      'current',
      'battery',
      'lamp',
      'switch',
      'ammeter',
      'voltmeter',
      'circuit',
      'short_circuit',
      'ohms_law',
    ];

    const termIds = glossary.map((item) => item.id);
    requiredIds.forEach((id) => {
      expect(termIds).toContain(id);
    });
  });

  it('should have unverified flag (verified: false) on all initial Tajik translations for teacher review', () => {
    glossary.forEach((term) => {
      expect(term.verified).toBe(false);
      expect(term.term_tg.length).toBeGreaterThan(0);
      expect(term.term_ru.length).toBeGreaterThan(0);
      expect(term.definition_tg.length).toBeGreaterThan(0);
      expect(term.definition_ru.length).toBeGreaterThan(0);
    });
  });

  it('should provide localized translations for both tg and ru via i18n.t()', () => {
    const appNameTg = t('app.name', 'tg');
    const appNameRu = t('app.name', 'ru');
    expect(appNameTg).toBe('Озмо Лаб');
    expect(appNameRu).toBe('Озмо Лаб');

    const statusClosedTg = t('journal.status.closed', 'tg');
    const statusClosedRu = t('journal.status.closed', 'ru');
    expect(statusClosedTg).toContain('Занҷир сарбаста');
    expect(statusClosedRu).toContain('Цепь замкнута');
  });
});
