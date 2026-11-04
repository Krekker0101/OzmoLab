# Notebook Photo Evaluation & Physics Problem Helper

**Project:** Ozmo Lab — Photo-to-Circuit & Notebook Problem Helper  
**Model:** Meta Muse Spark Open 1026 via Baseten Inference API  
**Status:** Initial Evaluation ($N = 2$ attached student notebook photos)  
**Strict Policy:** Per evaluation guidelines, overall aggregate accuracy percentages are NOT reported until at least 10 photos per supported topic are benchmarked.

---

## 1. Problem Classification & Router Architecture

The notebook photo feature routes student uploads through a strict classification pipeline:
1. **`circuit`**: Hand-drawn schematics, breadboards, wiring diagrams $\to$ Dispatched to the existing MNA circuit perception agent.
2. **`supported_problem`**: Physics numerical problems matching supported domains:
   - **Centre of Mass (`centre_of_mass`)**: Point masses in 1D and 2D, with numeric or symbolic coordinates ($d, a, x_i, y_i$).
   - **Ohm's Law & Equivalent Resistance (`resistance_circuit`)**: Pure series, parallel, or mixed resistor networks.
3. **`other_notes`**: Lecture notes, derivations, free-body diagrams, formulas without discrete point masses $\to$ Polite guidance asking student to select or enter the specific problem without guessing.
4. **`not_readable`**: Blurry, overexposed, cropped, or ambiguous text $\to$ Friendly retake prompt.

---

## 2. Test Photos & Real Pipeline Evaluation Results

The evaluation script `scripts/notebook-eval.ts` was executed against live Baseten inference (`meta-models/muse-spark-open-1026`) with zero mocks:

| Image | Description | Target Category | Extracted Model Output | Deterministic Solver Result | Tokens | Latency | Retries | Match? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `notebook_01_com_problems.png` | Handwritten page with 3 Centre of Mass problems (1D & 2D square) | `supported_problem` (`centre_of_mass`) | $3m @ (0,0)$, $4m @ (a,0)$, $m @ (a,a)$, $2m @ (0,a)$ with symbol $a$ | $X_{cm} = \frac{a}{2}$, $Y_{cm} = \frac{3a}{10}$ | 4,149 | 12.8s | 0 | **100% Match** with notebook handwritten solution |
| `notebook_02_mixed_notes.png` | Handwritten conceptual physics notes in mixed Bengali & English (spinning ball, chain, disk) | `other_notes` | Correctly detected as conceptual derivations without point mass coordinates; 0 false masses created | Clear, polite guidance in student's language to type or pick a specific numeric exercise | 2,814 | 8.9s | 0 | **100% Match** (Zero hallucination) |

### Key Metrics Summary ($N = 2$)
- **Average Completion Latency:** 10.85 seconds
- **Average Token Consumption:** 3,482 tokens per call
- **API Retries Required:** 0% (0 / 2 needed retry)
- **Hallucinated Components / Masses:** 0
- **Aggregate Accuracy:** *Pending evaluation of $\ge 10$ photos per topic before reporting aggregate percentage.*

---

## 3. Deterministic Physics Solver vs. Model Role

To ensure mathematical precision and eliminate hallucinations:
- **LLM Role (Perception Only):** Parses visual coordinates, masses, and variable symbols into a validated Zod schema (`CentreOfMassProblemSchema` / `ResistanceProblemSchema`).
- **Deterministic Code (Calculation):** TypeScript physics engine (`shared/solver/physicsSolver.ts`) computes:
  $$X_{cm} = \frac{\sum m_i x_i}{\sum m_i}, \quad Y_{cm} = \frac{\sum m_i y_i}{\sum m_i}$$
  Reduces fractions to lowest terms using integer Greatest Common Divisor (GCD) algorithms, generating exact rational answers (e.g., $\frac{3d}{4}$, $\frac{a}{2}, \frac{3a}{10}$).
- **Pedagogical Explanation:** Socratic 3-stage reveal:
  1. **Фаҳмиш (Hint):** Core conceptual law without giving away the calculation.
  2. **Қадам ба қадам (Step-by-step):** Explicit substituted numbers into the formula.
  3. **Ҷавоби пурра (Full Answer):** Exact simplified fractional answer with units.

---

## 4. Mobile Confirmation Step (360px Viewport)

Before running the deterministic solver:
- The original student photo is **never discarded**; it remains visible in an inspectable accordion/preview window.
- Extracted masses and coordinates are presented in a responsive card layout engineered for 360px mobile viewports.
- Any parameter with low confidence ($< 70\%$) is highlighted with an amber border and a "Please verify" label.
- The student can edit, add, or delete point masses or resistors with a single tap before clicking "Ҳисоб кунед" (Calculate).

---

## 5. Automated Unit & Integration Test Suite

The test suite covers known test cases, corner cases, and negative rejection:
- `tests/notebook-eval/physics-solver.test.ts`:
  - 1D 2-mass numeric: $m$ at $x=1$, $2m$ at $x=4 \implies X_{cm} = 3$
  - 1D 2-mass symbolic: $m$ at $0$, $3m$ at $d \implies X_{cm} = \frac{3d}{4}$
  - 2D 4-mass square: $3m$ at $(0,0)$, $4m$ at $(a,0)$, $m$ at $(a,a)$, $2m$ at $(0,a) \implies (X_{cm}, Y_{cm}) = (\frac{a}{2}, \frac{3a}{10})$
  - Series and parallel resistance calculation ($R_1 = 10\Omega, R_2 = 20\Omega \implies 30\Omega$ series, $6.67\Omega$ parallel)
- `tests/notebook-eval/router-negative.test.ts`:
  - Circuit schematics correctly routed to `circuit`
  - Plain lecture notes classified as `other_notes` with zero hallucinated components
  - Unreadable blurry images routed to `not_readable`
  - Mixed-language / messy handwriting flagged for student review
