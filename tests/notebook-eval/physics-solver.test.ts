/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit Tests for Deterministic Physics Solver and Notebook Problem Router
 * Meta Global AI Developer Hackathon (Indie Developer Track: "Build for Your World")
 */

import {describe, it, expect} from 'vitest';
import {
  solveCentreOfMass,
  solveResistanceProblem,
  formatFraction,
} from '../../shared/solver/physicsSolver.ts';
import {CentreOfMassProblem, ResistanceProblem} from '../../shared/schema/notebook.ts';

describe('Centre of Mass Deterministic Solver', () => {
  // Case 1: masses m at x=1 and 2m at x=4 gives 3
  it('correctly calculates 1D COM for m at x=1 and 2m at x=4 => 3', () => {
    const problem: CentreOfMassProblem = {
      dimension: '1D',
      items: [
        {id: 'm1', mass: 1, x: 1},
        {id: 'm2', mass: 2, x: 4},
      ],
    };

    const solution = solveCentreOfMass(problem);
    expect(solution.totalMass).toBe(3);
    expect(solution.xCom).toBe(3);
    expect(solution.formattedCoordinates).toBe('3');
    expect(solution.tutor.tg.finalAnswer).toContain('3');
    expect(solution.tutor.ru.finalAnswer).toContain('3');
    expect(solution.tutor.en.finalAnswer).toContain('3');
  });

  // Case 2: m at 0 and 3m at d gives 3d/4
  it('correctly calculates 1D COM for m at 0 and 3m at d => 3d/4', () => {
    const problem: CentreOfMassProblem = {
      dimension: '1D',
      variableSymbol: 'd',
      items: [
        {id: 'm1', mass: 1, x: 0},
        {id: 'm2', mass: 3, x: 1}, // 1 unit of d
      ],
    };

    const solution = solveCentreOfMass(problem);
    expect(solution.totalMass).toBe(4);
    expect(solution.xCom).toBe(0.75);
    expect(solution.xComFraction).toBe('3d/4');
    expect(solution.formattedCoordinates).toBe('3d/4');
  });

  // Case 3: masses 2m at (0,a), m at (a,a), 3m at (0,0), 4m at (a,0) gives (a/2, 3a/10)
  it('correctly calculates 2D square COM => (a/2, 3a/10)', () => {
    const problem: CentreOfMassProblem = {
      dimension: '2D',
      variableSymbol: 'a',
      items: [
        {id: 'm_bottom_left', mass: 3, x: 0, y: 0}, // 3m at (0,0)
        {id: 'm_bottom_right', mass: 4, x: 1, y: 0}, // 4m at (a,0)
        {id: 'm_top_right', mass: 1, x: 1, y: 1}, // m at (a,a)
        {id: 'm_top_left', mass: 2, x: 0, y: 1}, // 2m at (0,a)
      ],
    };

    const solution = solveCentreOfMass(problem);
    expect(solution.totalMass).toBe(10);
    expect(solution.xCom).toBe(0.5);
    expect(solution.yCom).toBe(0.3);
    expect(solution.xComFraction).toBe('a/2');
    expect(solution.yComFraction).toBe('3a/10');
    expect(solution.formattedCoordinates).toBe('(a/2, 3a/10)');
  });

  it('rejects an empty mass list safely', () => {
    const invalidProblem = {
      dimension: '1D' as const,
      items: [],
    };
    expect(() => solveCentreOfMass(invalidProblem)).toThrow();
  });
});

describe('Resistance & Ohm Law Deterministic Solver', () => {
  it('solves simple series resistor chain', () => {
    const problem: ResistanceProblem = {
      topology: 'series',
      voltage: 12,
      resistors: [
        {id: 'r1', resistance: 100},
        {id: 'r2', resistance: 200},
      ],
      target: 'current',
    };

    const res = solveResistanceProblem(problem);
    expect(res.equivalentResistance).toBe(300);
    expect(res.current).toBe(0.04);
  });

  it('solves parallel resistors', () => {
    const problem: ResistanceProblem = {
      topology: 'parallel',
      voltage: 6,
      resistors: [
        {id: 'r1', resistance: 100},
        {id: 'r2', resistance: 100},
      ],
      target: 'total_resistance',
    };

    const res = solveResistanceProblem(problem);
    expect(res.equivalentResistance).toBe(50);
  });
});
