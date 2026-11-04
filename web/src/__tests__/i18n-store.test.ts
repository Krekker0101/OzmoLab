/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб — Тесты хранилища интернационализации (useI18nStore)
 */

import {describe, it, expect} from 'vitest';
import {useI18nStore} from '../store/useI18nStore.ts';
import {useLabStore} from '../store/useLabStore.ts';

describe('useI18nStore language state management and synchronization', () => {
  it('should initialize with default language and switch properly', () => {
    useI18nStore.getState().setLanguage('tg');
    expect(useI18nStore.getState().language).toBe('tg');
    expect(useLabStore.getState().language).toBe('tg');

    useI18nStore.getState().setLanguage('ru');
    expect(useI18nStore.getState().language).toBe('ru');
    expect(useLabStore.getState().language).toBe('ru');
  });

  it('should cycle language tg -> ru -> en -> tg', () => {
    useI18nStore.getState().setLanguage('tg');
    useI18nStore.getState().toggleLanguage();
    expect(useI18nStore.getState().language).toBe('ru');

    useI18nStore.getState().toggleLanguage();
    expect(useI18nStore.getState().language).toBe('en');

    useI18nStore.getState().toggleLanguage();
    expect(useI18nStore.getState().language).toBe('tg');
  });

  it('should translate keys correctly via i18n store helper', () => {
    useI18nStore.getState().setLanguage('ru');
    const translatedRu = useI18nStore.getState().t('nav.home');
    expect(translatedRu).toBe('Главная');

    useI18nStore.getState().setLanguage('tg');
    const translatedTg = useI18nStore.getState().t('nav.home');
    expect(translatedTg).toBe('Саҳифаи асосӣ');
  });
});
