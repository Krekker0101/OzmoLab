/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Модальное окно терминологического словаря
 * Поддерживает светлую и тёмную темы, поиск и верификацию учителями.
 */

import React, {useState, useMemo} from 'react';
import {AlertCircle, CheckCircle2, Search, X} from 'lucide-react';
import {useLabStore} from '../store/useLabStore.ts';
import {t} from '../../../shared/i18n.ts';
import glossaryData from '../../../shared/glossary.json';
import {GlossaryTerm} from '../../../shared/types.ts';

export const GlossaryModal: React.FC = () => {
  const {language, theme, isGlossaryOpen, setGlossaryOpen} = useLabStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const isLight = theme === 'light';

  const terms = glossaryData as GlossaryTerm[];

  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      const matchesSearch =
        term.term_ru.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.term_tg.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition_ru.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition_tg.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || term.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [terms, searchQuery, selectedCategory]);

  if (!isGlossaryOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`border rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-700/80 text-slate-100'
        }`}
      >
        {/* Заголовок модального окна */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/70 border-slate-800'
          }`}
        >
          <div>
            <h2
              className={`text-base font-bold ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}
            >
              {t('glossary.title', language)}
            </h2>
            <p
              className={`text-xs mt-0.5 ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {language === 'tg'
                ? 'Истилоҳоти муҳимми физика ва электротехника барои мактабҳои Тоҷикистон'
                : 'Научно-технические термины физики и электротехники для школ Таджикистана'}
            </p>
          </div>
          <button
            onClick={() => setGlossaryOpen(false)}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight
                ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Панель поиска и фильтров */}
        <div
          className={`p-3.5 border-b flex flex-col sm:flex-row gap-2.5 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('glossary.search', language)}
              className={`w-full rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${
                isLight
                  ? 'bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400'
                  : 'bg-slate-950 border border-slate-700/80 text-slate-200 placeholder-slate-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : isLight
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('glossary.filter.all', language)}
            </button>
            <button
              onClick={() => setSelectedCategory('circuits')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                selectedCategory === 'circuits'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : isLight
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'tg' ? 'Занҷирҳо' : 'Цепи'}
            </button>
            <button
              onClick={() => setSelectedCategory('components')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                selectedCategory === 'components'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : isLight
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'tg' ? 'Унсурҳо' : 'Компоненты'}
            </button>
            <button
              onClick={() => setSelectedCategory('instruments')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                selectedCategory === 'instruments'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : isLight
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'tg' ? 'Асбобҳо' : 'Приборы'}
            </button>
          </div>
        </div>

        {/* Список терминов */}
        <div
          className={`flex-1 overflow-y-auto p-4 space-y-3.5 divide-y ${
            isLight ? 'divide-slate-200' : 'divide-slate-800'
          }`}
        >
          {filteredTerms.map((term) => (
            <div key={term.id} className="pt-3.5 first:pt-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm font-bold ${
                        isLight ? 'text-sky-700' : 'text-sky-400'
                      }`}
                    >
                      {term.term_tg}
                    </h3>
                    <span className="text-xs text-slate-400">/</span>
                    <h4
                      className={`text-sm font-semibold ${
                        isLight ? 'text-slate-800' : 'text-slate-200'
                      }`}
                    >
                      {term.term_ru}
                    </h4>
                  </div>

                  <p
                    className={`text-xs mt-1.5 leading-relaxed ${
                      isLight ? 'text-slate-600' : 'text-slate-300'
                    }`}
                  >
                    {language === 'tg' ? term.definition_tg : term.definition_ru}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-[11px]">
                    {term.symbol !== '-' && (
                      <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                        {t('glossary.symbol', language)}:{' '}
                        <strong className="text-amber-600 font-mono">
                          {term.symbol}
                        </strong>
                      </span>
                    )}
                    {term.unit !== '-' && (
                      <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                        {t('glossary.unit', language)}:{' '}
                        <strong className="text-emerald-600 font-mono">
                          {term.unit}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Статус проверки учителем */}
                <div className="shrink-0">
                  {term.verified ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isLight
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      {t('glossary.status.verified', language)}
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isLight
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                      }`}
                      title="Ин тарҷума бояд аз ҷониби омӯзгори физика тафтиш шавад"
                    >
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                      {t('glossary.badge.needs_review', language)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredTerms.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              {language === 'tg'
                ? 'Истилоҳе ёфт нашуд. Ибораи ҷустуҷӯро иваз кунед.'
                : 'Термины не найдены. Попробуйте изменить поисковый запрос.'}
            </div>
          )}
        </div>

        {/* Подвал модалки */}
        <div
          className={`p-3.5 border-t flex items-center justify-between text-xs ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-500'
              : 'bg-slate-950/80 border-slate-800 text-slate-400'
          }`}
        >
          <span>
            {language === 'tg'
              ? 'Тарҷумаҳои бо нишони зард ишорашуда барои санҷиши муаллимони мактаб пешбинӣ шудаанд.'
              : 'Термины со значком проверки помечены как draft и предназначены для верификации учителями физики.'}
          </span>
          <button
            onClick={() => setGlossaryOpen(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            {t('glossary.close', language)}
          </button>
        </div>
      </div>
    </div>
  );
};
