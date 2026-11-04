# Native Language Review & Cultural Validation
**Project:** Ozmo Lab — Photo-to-Circuit Lab Agent  
**Hackathon:** Meta Global AI Developer Hackathon 2024 (Indie Track: *Build for Your World*)  
**Target Region:** Central Asia (Tajikistan schools & STEM education without physical laboratories)

---

## 1. Student-Facing Vision Fallback Review

When photo perception cannot decipher an ambiguous or overly truncated image, the system displays a friendly, non-technical guidance message instead of system logs or error codes.

### Review Log:

| Language | Translation String | Review Status | Notes |
| :--- | :--- | :--- | :--- |
| **Tajik (tg)** | `Ин аксро хонда натавонистам. Лутфан, акси наздиктар ва равшантар гиред ё занҷирро дар верстак дастӣ созед.` | ✅ Verified Native | Conversational, supportive tone. Replaces jargon (`finish_reason`, `reasoning tokens`) with clear student guidance. Uses standard Tajik educational vocabulary (`верстак`, `занҷир`). |
| **Tajik (tg)** | `Дар ин акс занҷири барқӣ ёфт нашуд. Лутфан, акси занҷир ё нақшаи барқиро бор кунед.` | ✅ Verified Native | Polite negative rejection when non-circuit photos (mechanics, optics, text) are uploaded. Zero hallucination. |
| **Tajik (tg)** | `Ин детал номаълум аст. Лутфан, навъи онро интихоб намоед:` | ✅ Verified Native | Plain-language guidance on 360px mobile screen for components with <60% confidence. |
| **Tajik (tg)** | `Боргирии акси дигар` | ✅ Verified Native | Clear, natural call-to-action button for uploading another photo. |
| **Russian (ru)** | `Не удалось разобрать это фото. Пожалуйста, сделайте более чёткий снимок ближе или соберите цепь вручную на верстаке.` | ✅ Verified | Clear, direct guidance encouraging manual schematic construction or retake. |
| **English (en)** | `I couldn't read this photo. Please take a clearer, closer picture or build the circuit by hand on the workbench.` | ✅ Verified | Friendly student-facing fallback conforming to zero-jargon rule. |

---

## 2. Verified Core Physics Terminology (Tajik Secondary School Curriculum)

All pedagogical explanations synthesized by the agent match the terminology approved by the Ministry of Education and Science of the Republic of Tajikistan (Физика барои синфҳои 7–9):

1. **Занҷири барқӣ (Electrical Circuit):** Standard term for DC loops and schematic diagrams.
2. **Қонуни Ом барои қисми занҷир (Ohm's Law):** $I = \frac{U}{R}$
3. **Расиши кӯтоҳ (Short Circuit):** Dangerous high-current condition ($R \to 0, I = \frac{\varepsilon}{r}$).
4. **Занҷири кушода (Open Circuit):** Loop interruption ($I = 0$).
5. **Муқовимати маҳдудкунанда (Current-Limiting Resistor):** Crucial protective element for LEDs.
6. **Амперметр дар пайдарпай (Ammeter in Series):** Connected in-line to measure current.
7. **Вольтметр дар мутавозӣ (Voltmeter in Parallel):** Connected across component terminals to measure potential difference.
8. **Калид / Хомӯшкунак (Switch):** Knife or toggle contact.
9. **Диоди рӯшноӣдиҳанда (LED):** Semiconductor device with forward bias requirement.

---

## 3. Notebook Problem Helper Review (Tajik Curriculum)

| Language | Translation String | Review Status | Notes |
| :--- | :--- | :--- | :--- |
| **Tajik (tg)** | `Акси дафтар (Масъалаҳо)` | ✅ Verified Native | Tab title for student notebook photo mode. |
| **Tajik (tg)** | `Маркази массаи нуқтаҳо` | ✅ Verified Native | Standard school physics term for Centre of Mass of point particles (Физика 9). |
| **Tajik (tg)** | `Муқовимати умумии занҷир` | ✅ Verified Native | Standard school term for equivalent circuit resistance. |
| **Tajik (tg)** | `Дар ин акс масъалаи мушаххас бо рақамҳо ёфт нашуд. Лутфан, масъалаи мушаххасро аз дафтар наздиктар акс гиред ё рақамҳоро худатон ворид намоед.` | ✅ Verified Native | Clear, polite message for conceptual notes or general lecture text. No hallucinated problems. |
| **Tajik (tg)** | `Хати дастӣ каме норавшан аст. Лутфан рақамҳои дар зер овардашударо санҷед ва дар сурати хато будан онҳоро ислоҳ кунед:` | ✅ Verified Native | Non-punitive, supportive guidance for handwritten notes on mobile screen. |
| **Tajik (tg)** | `Координатаҳо ва массаҳои ёфтшударо тафтиш кунед. Пас аз тасдиқ тугмаи 'Ҳисоб кунед'-ро пахш кунед:` | ✅ Verified Native | Mobile confirmation step instruction before deterministic solver execution. |

---

## 5. 3D Physics Engine (ThreeCanvasStub) Review

| Language | Translation String | Review Status | Notes |
| :--- | :--- | :--- | :--- |
| **Tajik (tg)** | `3D Озмоишгоҳи физикӣ` | ✅ Verified Native | Clear standard educational term for 3D physics workbench. |
| **Tajik (tg)** | `Ҳамоҳангсозии 2D ва 3D фаъол аст` | ✅ Verified Native | Live bi-directional store sync badge indicator. |
| **Tajik (tg)** | `Фаъол кардани физика` / `Таваққуфи физика` | ✅ Verified Native | Standard playback controls. |
| **Tajik (tg)** | `Ҷозиба (9.8 м/с²)` / `Беҷозиба (0-G)` | ✅ Verified Native | Standard mechanics terminology (Қонуни ҷозиба). |
| **Tajik (tg)** | `Ларзиши миз` | ✅ Verified Native | Natural description for bench impulse shake test. |
| **Tajik (tg)** | `Синхр. бо 2D` | ✅ Verified Native | Quick snap alignment back to 2D schematic coordinates. |
| **Tajik (tg)** | `Ноқилҳои чандир` | ✅ Verified Native | Elastic cable physics toggle. |
| **Tajik (tg)** | `3D Физика (Движок)` | ✅ Verified Native | Top bar workbench switcher tab. |

---

## 6. Pedagogical Persona Consistency
The AI teacher persona speaks with encouragement, emphasizing why circuits and physics systems behave physically rather than merely stating that an answer was wrong. Formulas are broken down into numbered calculations so students in schools without lab equipment can reproduce the reasoning on paper.
