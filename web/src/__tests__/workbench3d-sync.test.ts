/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб — Тесты хука синхронизации useWorkbench3DSync и расчета физических характеристик
 */

import {describe, it, expect} from 'vitest';
import {computePhysicalAttributes} from '../hooks/useWorkbench3DSync.ts';
import {CircuitComponent, SimulationResult} from '../../../shared/types.ts';
import {map2DTo3D, map3DTo2D} from '../components/hero3d/workbench3d/Workbench3DScene.ts';
import {useLabStore} from '../store/useLabStore.ts';

describe('useWorkbench3DSync & computePhysicalAttributes', () => {
  it('computes accurate physical attributes for voltmeter', () => {
    const comp: CircuitComponent = {
      id: 'vm_1',
      type: 'voltmeter',
      x: 350,
      y: 200,
      rotation: 0,
      values: {},
      state: {},
    };

    const simResult: SimulationResult = {
      isClosedCircuit: true,
      hasShortCircuit: false,
      totalCurrent: 0.5,
      totalEquivalentResistance: 18,
      componentStates: {
        vm_1: {current: 0.00005, voltageDrop: 9.0, power: 0.00045, status: 'active'},
      },
      warnings: [],
    };

    const attrs = computePhysicalAttributes(comp, simResult);

    expect(attrs.type).toBe('voltmeter');
    expect(attrs.mass).toBe(2.2);
    expect(attrs.dimensions.width).toBeGreaterThan(1.5);
    expect(attrs.terminals.term_a).toBeDefined();
    expect(attrs.terminals.term_b).toBeDefined();
    // 9V out of 15V scale produces a positive deflection
    expect(attrs.electricalState.voltage).toBe(9.0);
    expect(attrs.electricalState.needleDeflectionRad).toBeLessThan(0.74);
  });

  it('computes accurate physical attributes for incandescent lamp with current glow', () => {
    const comp: CircuitComponent = {
      id: 'lamp_1',
      type: 'lamp',
      x: 600,
      y: 400,
      rotation: 0,
      values: {resistance: 10},
      state: {},
    };

    const simResult: SimulationResult = {
      isClosedCircuit: true,
      hasShortCircuit: false,
      totalCurrent: 0.9,
      totalEquivalentResistance: 10,
      componentStates: {
        lamp_1: {current: 0.9, voltageDrop: 9.0, power: 8.1, status: 'active'},
      },
      warnings: [],
    };

    const attrs = computePhysicalAttributes(comp, simResult);

    expect(attrs.type).toBe('lamp');
    expect(attrs.mass).toBe(0.8);
    expect(attrs.electricalState.brightness).toBeGreaterThan(0.5);
    expect(attrs.electricalState.power).toBe(8.1);
    expect(attrs.terminals.terminal_a).toBeDefined();
    expect(attrs.terminals.terminal_b).toBeDefined();
  });

  it('computes physical attributes for knife switch with open/closed state', () => {
    const openSwitch: CircuitComponent = {
      id: 'sw_1',
      type: 'switch',
      x: 500,
      y: 300,
      rotation: 0,
      values: {},
      state: {isOpen: true},
    };

    const closedSwitch: CircuitComponent = {
      ...openSwitch,
      id: 'sw_2',
      state: {isOpen: false},
    };

    const attrsOpen = computePhysicalAttributes(openSwitch, null);
    const attrsClosed = computePhysicalAttributes(closedSwitch, null);

    expect(attrsOpen.electricalState.isOpen).toBe(true);
    expect(attrsOpen.electricalState.resistance).toBeGreaterThan(1e6); // Open resistance

    expect(attrsClosed.electricalState.isOpen).toBe(false);
    expect(attrsClosed.electricalState.resistance).toBeLessThan(1.0); // Closed resistance
  });

  it('preserves exact 2D coordinates when mapped to 3D and back', () => {
    const testCases = [
      {x: 600, y: 400},
      {x: 200, y: 150},
      {x: 950, y: 550},
    ];

    for (const pt of testCases) {
      const p3d = map2DTo3D(pt.x, pt.y);
      const back2D = map3DTo2D(p3d.x, p3d.z);
      expect(back2D.x).toBe(pt.x);
      expect(back2D.y).toBe(pt.y);
    }
  });

  it('computes battery terminals with polarity and operational voltage', () => {
    const battery: CircuitComponent = {
      id: 'bat_1',
      type: 'battery',
      x: 300,
      y: 300,
      rotation: 0,
      values: {voltage: 12, internalResistance: 0.2},
      state: {},
    };

    const attrs = computePhysicalAttributes(battery, null);

    expect(attrs.type).toBe('battery');
    expect(attrs.electricalState.voltage).toBe(12);
    expect(attrs.terminals.positive).toBeDefined();
    expect(attrs.terminals.negative).toBeDefined();
    expect(attrs.mass).toBe(3.5); // Realistic heavy power source
  });

  it('toggles is3DModeEnabled in useLabStore correctly', () => {
    const store = useLabStore.getState();

    const initial = store.is3DModeEnabled;
    store.set3DModeEnabled(!initial);
    expect(useLabStore.getState().is3DModeEnabled).toBe(!initial);

    store.toggle3DMode();
    expect(useLabStore.getState().is3DModeEnabled).toBe(initial);
  });

  it('actively reacts when a new component is added to useLabStore', () => {
    const store = useLabStore.getState();

    const initialCount = store.components.length;
    store.addComponent('resistor', 450, 250);

    const updatedComponents = useLabStore.getState().components;
    expect(updatedComponents.length).toBe(initialCount + 1);

    const newComp = updatedComponents[updatedComponents.length - 1];
    expect(newComp.type).toBe('resistor');

    // Physical attributes are immediately computable
    const attrs = computePhysicalAttributes(newComp, null);
    expect(attrs.type).toBe('resistor');
    expect(attrs.mass).toBe(0.7);
    expect(attrs.elevationY).toBe(0.3);
  });
});

