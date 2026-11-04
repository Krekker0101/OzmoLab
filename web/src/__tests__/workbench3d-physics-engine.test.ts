/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб — Тесты 3D физического движка (Workbench3DPhysicsEngine)
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {Workbench3DPhysicsEngine} from '../services/workbench3dPhysicsEngine.ts';
import {CircuitComponent, Wire} from '../../../shared/types.ts';

describe('Workbench3DPhysicsEngine (3D rigid body workbench simulation)', () => {
  let engine: Workbench3DPhysicsEngine;

  beforeEach(() => {
    engine = new Workbench3DPhysicsEngine({
      tableHalfWidth: 5.8,
      tableHalfDepth: 3.8,
      gravityY: -9.81,
      defaultRestitution: 0.5,
    });
  });

  afterEach(() => {
    engine.destroy();
  });

  it('initializes with default physics parameters and boundaries', () => {
    expect(engine).toBeDefined();
    expect(engine.isGravityEnabled()).toBe(true);
    expect(engine.isSimulationRunning()).toBe(true);
    expect(engine.getRestitution()).toBe(0.5);
  });

  it('syncs 2D components into 3D rigid bodies on table plane', () => {
    const components: CircuitComponent[] = [
      {
        id: 'voltmeter_1',
        type: 'voltmeter',
        x: 600,
        y: 400,
        rotation: 0,
        values: {},
        state: {},
      },
      {
        id: 'lamp_1',
        type: 'lamp',
        x: 300,
        y: 200,
        rotation: 90,
        values: {resistance: 10},
        state: {},
      },
    ];

    engine.syncComponents(components);
    const transforms = engine.getTransforms();

    expect(transforms).toHaveLength(2);

    const vm = transforms.find((t) => t.id === 'voltmeter_1');
    expect(vm).toBeDefined();
    // 2D center (600, 400) maps to 3D center (0, 0)
    expect(Math.abs(vm!.x)).toBeLessThan(0.01);
    expect(Math.abs(vm!.z)).toBeLessThan(0.01);
    expect(vm!.y).toBeGreaterThan(0); // Rests on table surface
  });

  it('simulates vertical gravity and bounces off the table surface', () => {
    const components: CircuitComponent[] = [
      {
        id: 'comp_drop',
        type: 'resistor',
        x: 600,
        y: 400,
        rotation: 0,
        values: {},
        state: {},
      },
    ];

    engine.syncComponents(components);
    const body = engine.getBody('comp_drop')!;
    body.y = 3.0; // Lift high above table
    body.vy = 0;

    // Run physics steps (needs ~0.8s = 50+ steps to fall 3 meters under 9.81 m/s^2)
    for (let i = 0; i < 90; i++) {
      engine.step(0.016);
    }

    // Body should have fallen and collided with the table
    expect(body.y).toBeLessThanOrEqual(body.halfHeight + 0.8);
    expect(body.y).toBeGreaterThanOrEqual(body.halfHeight);
  });

  it('resolves elastic body-to-body collisions', () => {
    const components: CircuitComponent[] = [
      {
        id: 'comp_left',
        type: 'battery',
        x: 400,
        y: 400,
        rotation: 0,
        values: {},
        state: {},
      },
      {
        id: 'comp_right',
        type: 'lamp',
        x: 500,
        y: 400,
        rotation: 0,
        values: {},
        state: {},
      },
    ];

    engine.syncComponents(components);
    const bLeft = engine.getBody('comp_left')!;
    const bRight = engine.getBody('comp_right')!;

    // Send comp_left moving towards comp_right (+X direction)
    bLeft.vx = 4.0;
    bRight.vx = 0.0;

    for (let i = 0; i < 20; i++) {
      engine.step(0.016);
    }

    // Momentum transferred: bRight should now have positive X velocity
    expect(bRight.vx).toBeGreaterThan(0.2);
  });

  it('applies elastic wire spring tension between connected components', () => {
    const components: CircuitComponent[] = [
      {id: 'node_a', type: 'battery', x: 200, y: 400, rotation: 0, values: {}, state: {}},
      {id: 'node_b', type: 'resistor', x: 900, y: 400, rotation: 0, values: {}, state: {}},
    ];
    const wires: Wire[] = [
      {
        id: 'w1',
        from: {componentId: 'node_a', terminalId: 'pos'},
        to: {componentId: 'node_b', terminalId: 'term_a'},
      },
    ];

    engine.syncComponents(components);
    engine.syncWires(wires);

    const bA = engine.getBody('node_a')!;
    const bB = engine.getBody('node_b')!;

    // Step physics
    for (let i = 0; i < 15; i++) {
      engine.step(0.016);
    }

    // The wire spring pulls them towards each other: bA gains +X velocity, bB gains -X velocity
    expect(bA.vx).toBeGreaterThan(0);
    expect(bB.vx).toBeLessThan(0);
  });

  it('converts 3D transforms back to 2D coordinates for useLabStore synchronization', () => {
    const components: CircuitComponent[] = [
      {id: 'c1', type: 'switch', x: 600, y: 400, rotation: 0, values: {}, state: {}},
    ];

    engine.syncComponents(components);
    const updates = engine.getUpdatesFor2DStore();

    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe('c1');
    expect(updates[0].x).toBeCloseTo(600, -1);
    expect(updates[0].y).toBeCloseTo(400, -1);
  });

  it('shakes the workbench applying kinetic 3D impulses', () => {
    const components: CircuitComponent[] = [
      {id: 'c_shake', type: 'potentiometer', x: 600, y: 400, rotation: 0, values: {}, state: {}},
    ];

    engine.syncComponents(components);
    engine.shake(3.0);

    const b = engine.getBody('c_shake')!;
    expect(Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vz)).toBeGreaterThan(0);
  });
});
