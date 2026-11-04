/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Photo-to-Circuit Lab Agent — Deterministic Modified Nodal Analysis (MNA) DC Circuit Solver
 * Pure TypeScript, zero external dependencies.
 */

import {
  MNACircuit,
  MNAElement,
  MNAElementResult,
  MNASolution,
  MNAWarning,
} from './types.ts';

/** Disjoint-set / Union-Find for topological wire and closed switch net unification */
class DisjointSet {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();

  find(node: string): string {
    if (!this.parent.has(node)) {
      this.parent.set(node, node);
      this.rank.set(node, 0);
      return node;
    }
    let root = node;
    while (root !== this.parent.get(root)!) {
      root = this.parent.get(root)!;
    }
    // Path compression
    let curr = node;
    while (curr !== root) {
      const next = this.parent.get(curr)!;
      this.parent.set(curr, root);
      curr = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;

    const rankA = this.rank.get(rootA)!;
    const rankB = this.rank.get(rootB)!;
    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }
}

/** Solves A * x = z via Gaussian elimination with partial pivoting */
function solveLinearSystem(A: number[][], z: number[]): number[] | null {
  const n = A.length;
  if (n === 0) return [];

  // Create deep copy of augmented matrix
  const M: number[][] = A.map((row, i) => [...row, z[i]]);

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(M[row][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }

    // Singular or dependent equation
    if (maxVal < 1e-12) {
      // Floating / isolated node or redundant source; leave as 0 and continue
      continue;
    }

    // Swap pivot row
    if (maxRow !== col) {
      const temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;
    }

    // Eliminate below pivot
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      M[row][col] = 0;
      for (let j = col + 1; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    if (Math.abs(M[row][row]) < 1e-12) {
      x[row] = 0;
      continue;
    }
    let sum = M[row][n];
    for (let j = row + 1; j < n; j++) {
      sum -= M[row][j] * x[j];
    }
    x[row] = sum / M[row][row];
  }

  return x;
}

/**
 * Solves a DC electrical circuit using Modified Nodal Analysis (MNA).
 * Supports battery, resistor, lamp, LED, switch, ammeter, voltmeter, wire.
 */
export function solveCircuit(circuit: MNACircuit): MNASolution {
  const elements = circuit.elements || [];
  const warnings: MNAWarning[] = [];

  if (elements.length === 0) {
    return {
      nodeVoltages: {},
      elementResults: {},
      isClosedCircuit: false,
      hasShortCircuit: false,
      totalCurrent: 0,
      totalEquivalentResistance: 0,
      warnings: [{code: 'OPEN_CIRCUIT', message: 'The circuit contains no components.'}],
      status: 'open_circuit',
    };
  }

  // 1. Identify connected electrical nets using DisjointSet (Wires & Closed Switches unify nets)
  const ds = new DisjointSet();
  elements.forEach((el) => {
    ds.find(el.nodeA);
    ds.find(el.nodeB);

    if (el.type === 'wire') {
      ds.union(el.nodeA, el.nodeB);
    } else if (el.type === 'switch' && !el.isOpen) {
      ds.union(el.nodeA, el.nodeB);
    }
  });

  // Collect all unique nets
  const allRawNodes = new Set<string>();
  elements.forEach((el) => {
    allRawNodes.add(el.nodeA);
    allRawNodes.add(el.nodeB);
  });

  const netRoots = new Set<string>();
  allRawNodes.forEach((node) => {
    netRoots.add(ds.find(node));
  });

  const batteries = elements.filter((e) => e.type === 'battery');

  // Check for immediate zero-resistance short-circuit across a battery
  let hasDirectShort = false;
  batteries.forEach((bat) => {
    if (ds.find(bat.nodeA) === ds.find(bat.nodeB)) {
      hasDirectShort = true;
      warnings.push({
        code: 'SHORT_CIRCUIT',
        message: `Direct short circuit across battery ${bat.id}! Positive and negative terminals are connected by wire.`,
        elementId: bat.id,
      });
    }
  });

  // 2. Select Reference / Ground Net
  let groundNet = '';
  if (circuit.groundNode && allRawNodes.has(circuit.groundNode)) {
    groundNet = ds.find(circuit.groundNode);
  } else if (batteries.length > 0) {
    // Standard convention: negative terminal of the first battery is ground (0 V)
    groundNet = ds.find(batteries[0].nodeB);
  } else {
    // Check for explicit "0" or "GND"
    for (const node of allRawNodes) {
      if (node === '0' || node.toLowerCase() === 'gnd') {
        groundNet = ds.find(node);
        break;
      }
    }
    if (!groundNet) {
      groundNet = Array.from(netRoots)[0];
    }
  }

  // Map non-ground nets to index 0..N-1
  const netToIndex = new Map<string, number>();
  let nodeIdx = 0;
  for (const net of netRoots) {
    if (net !== groundNet) {
      netToIndex.set(net, nodeIdx++);
    }
  }
  const numNodes = nodeIdx;

  // 3. Iterative solver for non-linear elements (LEDs)
  interface LedState {
    isOn: boolean;
    forwardV: number;
    bulkR: number;
  }
  const ledStates = new Map<string, LedState>();
  elements
    .filter((e) => e.type === 'led')
    .forEach((led) => {
      ledStates.set(led.id, {
        isOn: false,
        forwardV: led.forwardVoltage ?? 2.0,
        bulkR: 10.0,
      });
    });

  let solutionVector: number[] = [];
  const voltageSourcesList = batteries.map((bat) => ({element: bat, type: 'battery' as const}));
  const numVsources = voltageSourcesList.length;
  const K = numNodes + numVsources;

  // Iterate up to 5 times for LED state convergence
  const maxIterations = 5;
  for (let iter = 0; iter < maxIterations; iter++) {
    // Allocate MNA matrices: A (K x K), z (K)
    const A: number[][] = Array.from({length: K}, () => new Array(K).fill(0));
    const z: number[] = new Array(K).fill(0);

    // Helper to add conductance between two nets
    const addConductance = (netA: string, netB: string, g: number) => {
      const u = netA === groundNet ? -1 : netToIndex.get(netA)!;
      const v = netB === groundNet ? -1 : netToIndex.get(netB)!;
      if (u >= 0) A[u][u] += g;
      if (v >= 0) A[v][v] += g;
      if (u >= 0 && v >= 0) {
        A[u][v] -= g;
        A[v][u] -= g;
      }
    };

    // Helper to add current source entering netA and leaving netB
    const addCurrentSource = (fromNet: string, toNet: string, iVal: number) => {
      const u = toNet === groundNet ? -1 : netToIndex.get(toNet)!;
      const v = fromNet === groundNet ? -1 : netToIndex.get(fromNet)!;
      if (u >= 0) z[u] += iVal;
      if (v >= 0) z[v] -= iVal;
    };

    // Stamp passive linear and non-linear companion elements into G and z
    elements.forEach((el) => {
      const netA = ds.find(el.nodeA);
      const netB = ds.find(el.nodeB);
      if (netA === netB) return; // Shorted internally

      if (el.type === 'resistor' || el.type === 'lamp') {
        const r = el.value ?? (el.type === 'lamp' ? 15 : 10);
        const g = 1 / Math.max(1e-6, r);
        addConductance(netA, netB, g);
      } else if (el.type === 'ammeter') {
        const r = el.internalResistance ?? 0.001;
        addConductance(netA, netB, 1 / r);
      } else if (el.type === 'voltmeter') {
        const r = 1e7; // 10 MΩ voltmeter input impedance
        addConductance(netA, netB, 1 / r);
      } else if (el.type === 'unknown') {
        // Unknown components have indefinite impedance; treat as high resistance probe
        addConductance(netA, netB, 1 / 1e7);
      } else if (el.type === 'switch' && el.isOpen) {
        // Open switch: infinite resistance
      } else if (el.type === 'led') {
        const st = ledStates.get(el.id)!;
        if (!st.isOn) {
          // Off state: subthreshold leakage
          addConductance(netA, netB, 1 / 1e7);
        } else {
          // Conducting state: SPICE diode piecewise companion model
          // I = (V_A - V_B - V_f) / bulkR = G * (V_A - V_B) - (V_f / bulkR)
          const g = 1 / st.bulkR;
          addConductance(netA, netB, g);
          // Companion current source: enters Node A, leaves Node B
          addCurrentSource(netB, netA, st.forwardV / st.bulkR);
        }
      }
    });

    // Stamp voltage sources (batteries) into B, C, D, z
    voltageSourcesList.forEach((vs, idx) => {
      const rowIdx = numNodes + idx;
      const el = vs.element;
      const netA = ds.find(el.nodeA); // Positive
      const netB = ds.find(el.nodeB); // Negative

      const u = netA === groundNet ? -1 : netToIndex.get(netA)!;
      const v = netB === groundNet ? -1 : netToIndex.get(netB)!;

      if (u >= 0) {
        A[u][rowIdx] += 1;
        A[rowIdx][u] += 1;
      }
      if (v >= 0) {
        A[v][rowIdx] -= 1;
        A[rowIdx][v] -= 1;
      }

      const emf = el.value ?? 9.0;
      z[rowIdx] = emf;

      const rInt = el.internalResistance ?? 0.2;
      // D-matrix diagonal term: V_A - V_B - rInt * I_discharge = EMF
      A[rowIdx][rowIdx] = -rInt;
    });

    // Solve linear system
    const solved = solveLinearSystem(A, z);
    if (!solved) {
      break;
    }
    solutionVector = solved;

    // Check if any LED state needs to toggle
    let stateChanged = false;
    for (const [ledId, st] of ledStates.entries()) {
      const ledEl = elements.find((e) => e.id === ledId)!;
      const netA = ds.find(ledEl.nodeA);
      const netB = ds.find(ledEl.nodeB);

      const vA = netA === groundNet ? 0 : solutionVector[netToIndex.get(netA)!] || 0;
      const vB = netB === groundNet ? 0 : solutionVector[netToIndex.get(netB)!] || 0;
      const vDrop = vA - vB;

      const shouldBeOn = vDrop >= st.forwardV - 0.05;
      if (shouldBeOn !== st.isOn) {
        st.isOn = shouldBeOn;
        stateChanged = true;
      }
    }

    if (!stateChanged) {
      break;
    }
  }

  // 4. Extract solved node voltages (mapping back to raw node names)
  const nodeVoltages: Record<string, number> = {};
  allRawNodes.forEach((node) => {
    const net = ds.find(node);
    if (net === groundNet) {
      nodeVoltages[node] = 0;
    } else {
      const idx = netToIndex.get(net)!;
      nodeVoltages[node] = Number((solutionVector[idx] || 0).toFixed(6));
    }
  });

  // 5. Compute per-element currents, powers, and operational diagnostics
  const elementResults: Record<string, MNAElementResult> = {};
  let totalBatteryCurrent = 0;
  let totalMaxCurrent = 0;

  // In MNA convention, current leaving the positive terminal of a voltage source is -I_MNA
  const vsCurrents = new Map<string, number>();
  voltageSourcesList.forEach((vs, idx) => {
    const iMna = solutionVector[numNodes + idx] || 0;
    // Current leaving positive terminal (discharge direction)
    const iDischarge = -iMna;
    vsCurrents.set(vs.element.id, iDischarge);
  });

  elements.forEach((el) => {
    const vA = nodeVoltages[el.nodeA] || 0;
    const vB = nodeVoltages[el.nodeB] || 0;
    const rawVDrop = vA - vB;
    const vDrop = Number(rawVDrop.toFixed(4));
    const netA = ds.find(el.nodeA);
    const netB = ds.find(el.nodeB);

    let current = 0;
    let power = 0;
    let illuminated = false;
    let brightness = 0;
    let isBlown = false;
    let isConducting = false;
    let isReverseBiased = false;
    let status: MNAElementResult['status'] = 'normal';

    if (el.type === 'battery') {
      current = Number((vsCurrents.get(el.id) || 0).toFixed(4));
      // In a discharge loop, current leaves positive terminal (+ve)
      power = Number(Math.abs((el.value ?? 9) * current).toFixed(4));
      status = Math.abs(current) > 10 ? 'overload' : 'active';
      totalBatteryCurrent += Math.max(0, current);
      totalMaxCurrent = Math.max(totalMaxCurrent, Math.abs(current));
    } else if (el.type === 'wire') {
      // Ideal wire has zero voltage drop
      current = 0; // Branch current calculated if part of closed loop
      status = 'normal';
    } else if (el.type === 'switch') {
      if (el.isOpen) {
        status = 'open';
      } else {
        status = 'active';
      }
    } else if (el.type === 'resistor') {
      const r = el.value ?? 10;
      current = Number((vDrop / r).toFixed(4));
      power = Number((Math.abs(vDrop) * Math.abs(current)).toFixed(4));
      status = Math.abs(current) > 2.0 ? 'overload' : Math.abs(current) > 0.001 ? 'active' : 'normal';
    } else if (el.type === 'lamp') {
      const r = el.value ?? 15;
      current = Number((vDrop / r).toFixed(4));
      power = Number((Math.abs(vDrop) * Math.abs(current)).toFixed(4));

      const ratedI = el.ratedCurrent ?? 0.6;
      const maxP = el.maxPower ?? 15.0; // Standard lab incandescent lamp threshold

      if (power > maxP || Math.abs(current) > 2.5) {
        isBlown = true;
        illuminated = false;
        brightness = 0;
        status = 'blown';
        warnings.push({
          code: 'BULB_BURNOUT',
          message: `Bulb ${el.id} burned out! Dissipated power ${power}W exceeds max rating ${maxP}W.`,
          elementId: el.id,
        });
      } else if (Math.abs(current) >= 0.05) {
        illuminated = true;
        brightness = Number(Math.min(1, Math.abs(current) / ratedI).toFixed(2));
        status = 'active';
      } else {
        illuminated = false;
        brightness = 0;
        status = 'normal';
      }
    } else if (el.type === 'led') {
      const forwardV = el.forwardVoltage ?? 2.0;
      const maxI = el.maxCurrent ?? 0.05; // 50 mA absolute max rating

      if (vDrop < -5.0) {
        isReverseBiased = true;
        status = 'reverse_bias';
        warnings.push({
          code: 'LED_REVERSE_BIAS',
          message: `LED ${el.id} is reverse-biased with ${Math.abs(vDrop)}V (exceeds 5V reverse breakdown rating).`,
          elementId: el.id,
        });
      } else if (vDrop >= forwardV - 0.05) {
        isConducting = true;
        // Current through forward-biased LED comes from the MNA solution vector
        const iSolved = vsCurrents.get(el.id);
        current = iSolved !== undefined && Math.abs(iSolved) > 0.0001
          ? Number(Math.abs(iSolved).toFixed(4))
          : Number(Math.max(0, (vDrop - forwardV) / 10).toFixed(4));
        power = Number((vDrop * current).toFixed(4));

        if (current > maxI) {
          isBlown = true;
          illuminated = false;
          status = 'blown';
          warnings.push({
            code: 'LED_BURNOUT_NO_RESISTOR',
            message: `LED ${el.id} destroyed! Current ${current.toFixed(2)}A exceeded ${maxI}A. An LED must have a series current-limiting resistor!`,
            elementId: el.id,
          });
        } else {
          illuminated = true;
          brightness = Number(Math.min(1, current / (el.ratedCurrent ?? 0.02)).toFixed(2));
          status = 'active';
        }
      } else {
        // Below forward voltage threshold
        illuminated = false;
        status = 'normal';
      }
    } else if (el.type === 'ammeter') {
      const r = el.internalResistance ?? 0.001;
      current = Number((rawVDrop / r).toFixed(4));
      status = 'active';

      // Check if ammeter is connected directly across a battery or voltage source (meter misplaced)
      const isAcrossBattery = batteries.some(
        (b) =>
          (b.nodeA === el.nodeA && b.nodeB === el.nodeB) ||
          (b.nodeA === el.nodeB && b.nodeB === el.nodeA),
      );
      if (isAcrossBattery || current > 10.0) {
        warnings.push({
          code: 'METER_MISPLACED',
          message: `Ammeter ${el.id} is connected in parallel across the voltage source! Ammeters have zero internal resistance and must be connected in series with the load.`,
          elementId: el.id,
        });
      }
    } else if (el.type === 'voltmeter') {
      current = 0;
      status = 'active';

      // Check if voltmeter is placed in series in a single-loop circuit
      // Only flags if there are NO open switches explaining the open loop,
      // and the voltmeter is NOT across the battery terminals or across a switch
      const hasOpenSwitch = elements.some((e) => e.type === 'switch' && e.isOpen);
      const isAcrossBattery = batteries.some(
        (b) =>
          (b.nodeA === el.nodeA && b.nodeB === el.nodeB) ||
          (b.nodeA === el.nodeB && b.nodeB === el.nodeA),
      );
      const isAcrossSwitch = elements.some(
        (e) =>
          e.type === 'switch' &&
          ((e.nodeA === el.nodeA && e.nodeB === el.nodeB) ||
            (e.nodeA === el.nodeB && e.nodeB === el.nodeA)),
      );

      const primaryBat = batteries[0];
      if (
        !hasOpenSwitch &&
        !isAcrossBattery &&
        !isAcrossSwitch &&
        primaryBat &&
        Math.abs(vDrop - (primaryBat.value ?? 9.0)) < 0.2 &&
        elements.length > 2
      ) {
        // If all other non-battery loads (lamps/resistors) have ~0 current
        const otherLoads = elements.filter(
          (e) => e.type === 'lamp' || e.type === 'resistor' || e.type === 'led',
        );
        const allLoadsOff =
          otherLoads.length > 0 &&
          otherLoads.every((ld) => {
            const res = elementResults[ld.id];
            return !res || Math.abs(res.current) < 0.0001;
          });
        if (allLoadsOff) {
          warnings.push({
            code: 'METER_MISPLACED',
            message: `Voltmeter ${el.id} appears to be connected in series with the circuit! Voltmeters have near-infinite resistance (10 MΩ) and block circuit current. Voltmeters must be connected in parallel.`,
            elementId: el.id,
          });
        }
      }
    } else if (el.type === 'unknown') {
      current = 0;
      status = 'normal';
      warnings.push({
        code: 'UNKNOWN_COMPONENT',
        message: `Component ${el.id} has an unknown type and needs confirmation before simulation.`,
        elementId: el.id,
      });
    }

    elementResults[el.id] = {
      elementId: el.id,
      type: el.type,
      nodeA: el.nodeA,
      nodeB: el.nodeB,
      voltageA: vA,
      voltageB: vB,
      voltageDrop: vDrop,
      current,
      power,
      illuminated,
      brightness,
      isBlown,
      isConducting,
      isReverseBiased,
      status,
    };
  });

  // 6. High-level Circuit Diagnostics
  const isClosed = totalBatteryCurrent > 0.001 || Object.values(elementResults).some((e) => Math.abs(e.current) > 0.001);
  const hasShortCircuit = hasDirectShort || totalMaxCurrent > 15.0;

  if (hasShortCircuit && !hasDirectShort) {
    warnings.push({
      code: 'SHORT_CIRCUIT',
      message: `Extreme current detected (${totalMaxCurrent.toFixed(2)}A)! The circuit has an uncontrolled low-resistance short path.`,
    });
  }

  if (!isClosed && !hasShortCircuit && elements.length > 0) {
    warnings.push({
      code: 'OPEN_CIRCUIT',
      message: 'The circuit is open. Current cannot flow because there is no closed conductive loop back to the power source.',
    });
  }

  const primaryBattery = batteries[0];
  const primaryEMF = primaryBattery?.value ?? 9.0;
  const totalEquivalentResistance =
    totalBatteryCurrent > 0.0001
      ? Number((primaryEMF / totalBatteryCurrent).toFixed(2))
      : 0;

  let overallStatus: MNASolution['status'] = 'ok';
  if (hasShortCircuit) {
    overallStatus = 'short_circuit';
  } else if (warnings.some((w) => w.code === 'BULB_BURNOUT' || w.code === 'LED_BURNOUT_NO_RESISTOR')) {
    overallStatus = 'burned_component';
  } else if (!isClosed) {
    overallStatus = 'open_circuit';
  } else if (warnings.some((w) => w.code === 'HIGH_CURRENT' || w.code === 'VOLTAGE_OVERLOAD')) {
    overallStatus = 'overload';
  }

  return {
    nodeVoltages,
    elementResults,
    isClosedCircuit: isClosed,
    hasShortCircuit,
    totalCurrent: Number(totalBatteryCurrent.toFixed(4)),
    totalEquivalentResistance,
    warnings,
    status: overallStatus,
  };
}

/**
 * Maps an MNASolution to a high-level educational verdict:
 * 'works' | 'open circuit' | 'short circuit' | 'meter misplaced'
 */
export function getCircuitVerdict(
  solution: MNASolution,
): 'works' | 'open circuit' | 'short circuit' | 'meter misplaced' {
  if (solution.warnings.some((w) => w.code === 'METER_MISPLACED')) {
    return 'meter misplaced';
  }
  if (
    solution.hasShortCircuit ||
    solution.status === 'short_circuit' ||
    solution.warnings.some((w) => w.code === 'SHORT_CIRCUIT')
  ) {
    return 'short circuit';
  }
  if (
    solution.status === 'open_circuit' ||
    !solution.isClosedCircuit ||
    solution.warnings.some((w) => w.code === 'OPEN_CIRCUIT')
  ) {
    return 'open circuit';
  }
  return 'works';
}
