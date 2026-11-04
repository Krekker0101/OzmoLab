/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Zustand Store интернационализации и локализации (i18n)
 */

import {create} from 'zustand';
import {SupportedLanguage} from '../../../shared/types.ts';
import {t as translate} from '../../../shared/i18n.ts';
import {useLabStore} from './useLabStore.ts';

export interface I18nStoreState {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const useI18nStore = create<I18nStoreState>((set, get) => {
  // Инициализируем язык из существующего useLabStore или по умолчанию 'tg'
  const initialLang: SupportedLanguage = useLabStore.getState().language || 'tg';

  return {
    language: initialLang,

    setLanguage: (language: SupportedLanguage) => {
      set({language});
      // Синхронизируем с общим хранилищем приложения
      const labStore = useLabStore.getState();
      if (labStore.language !== language) {
        labStore.setLanguage(language);
      }
    },

    toggleLanguage: () => {
      const current = get().language;
      const nextLang: SupportedLanguage = current === 'tg' ? 'ru' : current === 'ru' ? 'en' : 'tg';
      get().setLanguage(nextLang);
    },

    t: (key: string, params?: Record<string, string | number>) => {
      return translate(key, get().language, params);
    },
  };
});

// Двусторонняя реактивная синхронизация при изменении языка в useLabStore
useLabStore.subscribe((state) => {
  const currentI18nLang = useI18nStore.getState().language;
  if (state.language && state.language !== currentI18nLang) {
    useI18nStore.setState({language: state.language});
  }
});
