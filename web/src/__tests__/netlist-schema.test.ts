/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Photo-to-Circuit Lab Agent — Unit Tests for Netlist Schema & Conversion
 */

import {describe, it, expect} from 'vitest';
import {
  validateNetlist,
  convertNetlistToMNACircuit,
  convertMNACircuitToNetlist,
  NetlistCircuit,
} from '../../../shared/schema/netlist.ts';
import {solveCircuit} from '../../../shared/solver/mnaSolver.ts';

describe('Netlist Schema & Conversion', () => {
  it('validates a correct NetlistCircuit with bounding boxes and metadata', () => {
    const validJson = {
      circuitId: 'circuit_001',
      components: [
        {
          id: 'bat1',
          type: 'battery',
          nodeA: 'n1',
          nodeB: '0',
          value: 9,
          internalResistance: 0.1,
          boundingBox: {ymin: 100, xmin: 50, ymax: 300, xmax: 250},
        },
        {
          id: 'r1',
          type: 'resistor',
          nodeA: 'n1',
          nodeB: '0',
          value: 100,
          boundingBox: {ymin: 150, xmin: 400, ymax: 280, xmax: 600},
        },
      ],
      groundNode: '0',
      metadata: {
        source: 'photo',
        description: 'Simple 9V battery with 100 ohm resistor',
      },
    };

    const res = validateNetlist(validJson);
    expect(res.success).toBe(true);
    expect(res.data?.components).toHaveLength(2);
    expect(res.data?.components[0].type).toBe('battery');
  });

  it('rejects an invalid netlist with missing required node connections', () => {
    const invalidJson = {
      components: [
        {
          id: 'r1',
          type: 'resistor',
          // missing nodeA and nodeB
          value: 50,
        },
      ],
    };

    const res = validateNetlist(invalidJson);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.issues?.some((i) => i.path.includes('nodeA'))).toBe(true);
  });

  it('rejects an empty circuit with zero components', () => {
    const emptyJson = {
      components: [],
    };

    const res = validateNetlist(emptyJson);
    expect(res.success).toBe(false);
  });

  it('seamlessly converts Netlist to MNACircuit and solves with MNA solver', () => {
    const netlist: NetlistCircuit = {
      components: [
        {id: 'bat1', type: 'battery', nodeA: 'vcc', nodeB: 'gnd', value: 5.0, internalResistance: 0},
        {id: 'r_limit', type: 'resistor', nodeA: 'vcc', nodeB: 'n_led', value: 150.0},
        {id: 'led1', type: 'led', nodeA: 'n_led', nodeB: 'gnd', forwardVoltage: 2.0},
      ],
      groundNode: 'gnd',
    };

    const mnaCircuit = convertNetlistToMNACircuit(netlist);
    expect(mnaCircuit.elements).toHaveLength(3);

    const solution = solveCircuit(mnaCircuit);
    expect(solution.isClosedCircuit).toBe(true);
    expect(solution.elementResults['led1'].illuminated).toBe(true);
    expect(solution.elementResults['led1'].current).toBeGreaterThan(0.01);

    const roundtrip = convertMNACircuitToNetlist(mnaCircuit);
    expect(roundtrip.components).toHaveLength(3);
    expect(roundtrip.components[0].id).toBe('bat1');
  });
});
