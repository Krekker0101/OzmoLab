/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Компонент переключения языка интерфейса (Language Switcher)
 * Использует useI18nStore для переключения между таджикским (tg) и русским (ru).
 */

import React from 'react';
import {Globe} from 'lucide-react';
import {useI18nStore} from '../store/useI18nStore.ts';
import {SupportedLanguage} from '../../../shared/types.ts';

interface LanguageOption {
  code: SupportedLanguage;
  shortLabel: string;
  fullLabel: string;
}

const LANGUAGES: LanguageOption[] = [
  {code: 'tg', shortLabel: 'TG', fullLabel: 'Тоҷикӣ'},
  {code: 'ru', shortLabel: 'RU', fullLabel: 'Русский'},
  {code: 'en', shortLabel: 'EN', fullLabel: 'English'},
];

interface LanguageSwitcherProps {
  className?: string;
  showIcon?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  showIcon = true,
}) => {
  const {language, setLanguage} = useI18nStore();

  return (
    <div
      role="group"
      aria-label="Интихоби забон / Выбор языка"
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-lg border transition-colors bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs ${className}`}
    >
      {showIcon && (
        <span
          className="pl-1.5 pr-0.5 text-slate-400 dark:text-slate-400 flex items-center justify-center shrink-0 pointer-events-none"
          aria-hidden="true"
        >
          <Globe className="w-3.5 h-3.5" />
        </span>
      )}

      {LANGUAGES.map((lang) => {
        const isActive = language === lang.code;

        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            aria-pressed={isActive}
            title={`${lang.fullLabel} (${lang.shortLabel})`}
            className={`px-2 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap active:scale-95 ${
              isActive
                ? 'bg-sky-600 text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            {lang.shortLabel}
          </button>
        );
      })}
    </div>
  );
};
