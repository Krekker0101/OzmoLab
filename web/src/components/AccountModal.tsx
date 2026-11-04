/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Модальное окно личного кабинета и профиля ученика/учителя
 */

import React, {useState} from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  MapPin,
  School,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react';
import {useLabStore} from '../store/useLabStore.ts';
import {t} from '../../../shared/i18n.ts';
import {UserProfile} from '../../../shared/types.ts';

export const AccountModal: React.FC = () => {
  const {language, theme, isAccountOpen, setAccountOpen, userProfile, setUserProfile} =
    useLabStore();

  const isLight = theme === 'light';

  const [formData, setFormData] = useState<UserProfile>({...userProfile});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'about'>('profile');

  if (!isAccountOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const tajikCities = [
    'Душанбе',
    'Хуҷанд (Суғд)',
    'Бохтар (Хатлон)',
    'Кӯлоб (Хатлон)',
    'Хоруғ (ВМКБ)',
    'Истаравшан',
    'Панҷакент',
    'Турсунзода',
    'Ноҳияҳои тобеи марказ',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-700/80 text-slate-100'
        }`}
      >
        {/* Шапка модального окна */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/70 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                isLight ? 'bg-sky-600 text-white' : 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              }`}
            >
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2
                className={`text-sm font-bold ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                {language === 'tg' ? 'Ҳисоби корбар ва дастовардҳо' : language === 'ru' ? 'Личный кабинет и прогресс' : 'Account and progress'}
              </h2>
              <p
                className={`text-[11px] ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {formData.role === 'student'
                  ? language === 'tg'
                    ? 'Профили хонандаи мактаб'
                    : language === 'ru' ? 'Профиль учащегося' : 'Student profile'
                  : language === 'tg'
                    ? 'Профили омӯзгори физика'
                    : language === 'ru' ? 'Профиль преподавателя' : 'Teacher profile'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Переключатель вкладок Профиль / О проекте */}
            <div
              className={`flex p-0.5 rounded-lg border text-xs ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
              }`}
            >
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  activeTab === 'profile'
                    ? isLight
                      ? 'bg-white text-sky-600 shadow-2xs'
                      : 'bg-sky-600 text-white shadow-sm'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'tg' ? 'Профил' : language === 'ru' ? 'Профиль' : 'Profile'}
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  activeTab === 'about'
                    ? isLight
                      ? 'bg-white text-sky-600 shadow-2xs'
                      : 'bg-sky-600 text-white shadow-sm'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'tg' ? 'Дар бораи лоиҳа' : language === 'ru' ? 'О проекте' : 'About'}
              </button>
            </div>

            <button
              onClick={() => setAccountOpen(false)}
              className={`p-1.5 rounded-lg transition-colors ${
                isLight
                  ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Тело модального окна */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'profile' ? (
            <>
              {/* Статистика и прогресс ученика */}
              <div className="grid grid-cols-3 gap-3">
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-gradient-to-br from-amber-50 to-amber-50/30 border-amber-200/90'
                      : 'bg-slate-800/80 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                    <Zap className="w-4 h-4 fill-current" />
                    <span className="text-[11px] font-bold uppercase">{language === 'en' ? 'XP / Points' : 'XP / Баллы'}</span>
                  </div>
                  <span
                    className={`text-xl font-extrabold font-mono ${
                      isLight ? 'text-amber-800' : 'text-amber-400'
                    }`}
                  >
                    {formData.xp}
                  </span>
                </div>

                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-gradient-to-br from-sky-50 to-sky-50/30 border-sky-200/90'
                      : 'bg-slate-800/80 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-sky-500 mb-1">
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase">
                      {language === 'tg' ? 'Озмоишҳо' : language === 'ru' ? 'Опыты' : 'Experiments'}
                    </span>
                  </div>
                  <span
                    className={`text-xl font-extrabold font-mono ${
                      isLight ? 'text-sky-800' : 'text-sky-400'
                    }`}
                  >
                    {formData.completedLabsCount}
                  </span>
                </div>

                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-gradient-to-br from-emerald-50 to-emerald-50/30 border-emerald-200/90'
                      : 'bg-slate-800/80 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
                    <Award className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase">
                      {language === 'tg' ? 'Нишонҳо' : language === 'ru' ? 'Медали' : 'Badges'}
                    </span>
                  </div>
                  <span
                    className={`text-xl font-extrabold font-mono ${
                      isLight ? 'text-emerald-800' : 'text-emerald-400'
                    }`}
                  >
                    {formData.badges.length}
                  </span>
                </div>
              </div>

              {/* Значки достижений */}
              <div>
                <label
                  className={`text-xs font-bold uppercase tracking-wider block mb-2 ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {language === 'tg' ? 'Дастовардҳои илмӣ' : language === 'ru' ? 'Научные достижения' : 'Scientific achievements'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${
                        isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
                          : 'bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      {badge}
                    </span>
                  ))}
                </div>
              </div>

              {/* Форма редактирования профиля */}
              <form onSubmit={handleSave} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`text-xs font-semibold block mb-1 ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      {language === 'tg' ? 'Ном ва насаб' : language === 'ru' ? 'Имя и фамилия' : 'Full name'}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`w-full rounded-xl px-3 py-2 text-xs border outline-none font-medium focus:ring-2 focus:ring-sky-500 ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-800'
                          : 'bg-slate-800 border-slate-700 text-slate-100'
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`text-xs font-semibold block mb-1 ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      {language === 'tg' ? 'Нақш дар лоиҳа' : language === 'ru' ? 'Роль в платформе' : 'Platform role'}
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          role: e.target.value as 'student' | 'teacher',
                        })
                      }
                      className={`w-full rounded-xl px-3 py-2 text-xs border outline-none font-medium ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-800'
                          : 'bg-slate-800 border-slate-700 text-slate-100'
                      }`}
                    >
                      <option value="student">
                        {language === 'tg' ? 'Хонанда (Ученик)' : language === 'ru' ? 'Учащийся (Школьник)' : 'Student'}
                      </option>
                      <option value="teacher">
                        {language === 'tg' ? 'Омӯзгор (Учитель)' : language === 'ru' ? 'Преподаватель (Учитель)' : 'Teacher'}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      className={`text-xs font-semibold block mb-1 ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      {language === 'tg' ? 'Шаҳр ё минтақа' : language === 'ru' ? 'Город или регион' : 'City or region'}
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className={`w-full rounded-xl px-3 py-2 text-xs border outline-none font-medium ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-800'
                          : 'bg-slate-800 border-slate-700 text-slate-100'
                      }`}
                    >
                      {tajikCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className={`text-xs font-semibold block mb-1 ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      {language === 'tg' ? 'Мактаб ё литсей' : language === 'ru' ? 'Школа или лицей' : 'School or lyceum'}
                    </label>
                    <input
                      type="text"
                      value={formData.school}
                      onChange={(e) => setFormData({...formData, school: e.target.value})}
                      className={`w-full rounded-xl px-3 py-2 text-xs border outline-none font-medium focus:ring-2 focus:ring-sky-500 ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-800'
                          : 'bg-slate-800 border-slate-700 text-slate-100'
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`text-xs font-semibold block mb-1 ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      {language === 'tg' ? 'Синф' : language === 'ru' ? 'Класс' : 'Grade'}
                    </label>
                    <select
                      value={formData.grade}
                      onChange={(e) =>
                        setFormData({...formData, grade: Number(e.target.value)})
                      }
                      className={`w-full rounded-xl px-3 py-2 text-xs border outline-none font-medium ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-800'
                          : 'bg-slate-800 border-slate-700 text-slate-100'
                      }`}
                    >
                      <option value={8}>8 {language === 'tg' ? 'синф' : language === 'ru' ? 'класс' : 'grade'}</option>
                      <option value={9}>9 {language === 'tg' ? 'синф' : language === 'ru' ? 'класс' : 'grade'}</option>
                      <option value={10}>10 {language === 'tg' ? 'синф' : language === 'ru' ? 'класс' : 'grade'}</option>
                      <option value={11}>11 {language === 'tg' ? 'синф' : language === 'ru' ? 'класс' : 'grade'}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {savedSuccess ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      {language === 'tg' ? 'Маълумот сабт шуд!' : language === 'ru' ? 'Профиль сохранён!' : 'Profile saved!'}
                    </span>
                  ) : (
                    <span />
                  )}

                  <button
                    type="submit"
                    className="py-2.5 px-6 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95"
                  >
                    {language === 'tg' ? 'Сабти тағйирот' : language === 'ru' ? 'Сохранить профиль' : 'Save profile'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Вкладка «Дар бораи лоиҳа / О проекте» */
            <div className="space-y-4 text-xs leading-relaxed">
              <div
                className={`p-4 rounded-2xl border ${
                  isLight
                    ? 'bg-sky-50/70 border-sky-200 text-slate-800'
                    : 'bg-sky-950/40 border-sky-800/60 text-slate-200'
                }`}
              >
                <h3 className="font-bold text-sm text-sky-600 mb-2">
                  {language === 'tg'
                    ? 'Ҳадафи миллии «Озмо Лаб»'
                    : 'Национальная миссия «Озмо Лаб»'}
                </h3>
                <p>
                  {language === 'tg'
                    ? 'Озмо Лаб аввалин платформаи миллии озмоишгоҳҳои виртуалии интерактивӣ барои хонандагони синфҳои 8-11-и мактабҳои Тоҷикистон мебошад. Платформа камбуди асбобҳои воқеии лабораториро пурра ҷуброн намуда, ба ҳар як толибилм имкони гузаронидани таҷрибаҳои дақиқи физикӣ, электротехникӣ ва биологиро фароҳам меорад.'
                    : 'Озмо Лаб — первая национальная образовательная платформа виртуальных лабораторий для школьников 8-11 классов Таджикистана. Она устраняет дефицит оборудования в кабинетах физики, позволяя каждому ученику безопасно и наглядно проводить полноценные научные эксперименты.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div
                  className={`p-3.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
                  }`}
                >
                  <h4 className="font-bold mb-1 text-amber-500">
                    ⚡ {language === 'tg' ? 'Ҳисоббарории дақиқи физикӣ' : language === 'ru' ? 'Строгая физическая модель' : 'Accurate physics calculations'}
                  </h4>
                  <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                    {language === 'tg'
                      ? 'Ҳамаи схемаҳо бо усули потенсиалҳои гиреҳӣ (Nodal Analysis) ва қонунҳои Кирхгоф дар вақти воқеӣ ҳисоб карда мешаванд.'
                      : 'Все расчеты токов и напряжений производятся честным решателем узловых потенциалов без захардкоженных таблиц.'}
                  </p>
                </div>

                <div
                  className={`p-3.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
                  }`}
                >
                  <h4 className="font-bold mb-1 text-sky-500">
                    🤖 {language === 'tg' ? 'Омӯзгори ҳушманд (ИИ)' : language === 'ru' ? 'Сократический ИИ-наставник' : 'Socratic AI tutor'}
                  </h4>
                  <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                    {language === 'tg'
                      ? 'Наставник ҷавоби тайёр намедиҳад, балки бо саволҳои роҳнамо фикрронии мустақилонаро меомӯзад.'
                      : 'ИИ видит состояние схемы, не выдумывает цифры и обучает наводящими вопросами на таджикском и русском языках.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
