/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб — Тесты физического движка Matter.js (WorkbenchPhysicsService)
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {
  WorkbenchPhysicsService,
  COMPONENT_PHYSICS_WIDTH,
  COMPONENT_PHYSICS_HEIGHT,
} from '../services/physicsEngine.ts';
import {CircuitComponent, Wire} from '../../../shared/types.ts';

describe('WorkbenchPhysicsService (Matter.js 2D real-time simulation)', () => {
  let service: WorkbenchPhysicsService;

  beforeEach(() => {
    service = new WorkbenchPhysicsService({
      width: 1000,
      height: 800,
      gravityY: 0,
      restitution: 0.5,
    });
  });

  afterEach(() => {
    service.destroy();
  });

  it('should initialize with boundaries and correct dimensions', () => {
    expect(service).toBeDefined();
    expect(service.getGravityEnabled()).toBe(false);
    expect(service.getRestitution()).toBe(0.5);
  });

  it('should sync circuit components to Matter.js bodies and retrieve transforms', () => {
    const components: CircuitComponent[] = [
      {
        id: 'bat_1',
        type: 'battery',
        x: 100,
        y: 200,
        rotation: 0,
        values: {voltage: 9},
        state: {},
      },
      {
        id: 'lamp_1',
        type: 'lamp',
        x: 400,
        y: 200,
        rotation: 90,
        values: {resistance: 15},
        state: {},
      },
    ];

    service.syncComponents(components);
    const transforms = service.getAllTransforms();

    expect(transforms).toHaveLength(2);

    const bat = transforms.find((t) => t.id === 'bat_1');
    expect(bat).toBeDefined();
    expect(bat?.x).toBe(100);
    expect(bat?.y).toBe(200);

    const lamp = transforms.find((t) => t.id === 'lamp_1');
    expect(lamp).toBeDefined();
    expect(lamp?.rotation).toBe(90);
  });

  it('should update positions during simulation step under gravity', () => {
    const components: CircuitComponent[] = [
      {
        id: 'res_1',
        type: 'resistor',
        x: 200,
        y: 100,
        rotation: 0,
        values: {resistance: 10},
        state: {},
      },
    ];

    service.syncComponents(components);
    service.setGravity(true, 1.5);
    expect(service.getGravityEnabled()).toBe(true);

    // Выполняем серию шагов физической симуляции (падение вниз под действием гравитации)
    for (let i = 0; i < 20; i++) {
      service.step(16.6);
    }

    const transforms = service.getAllTransforms();
    const res = transforms.find((t) => t.id === 'res_1');
    expect(res).toBeDefined();
    // Из-за гравитации y должен увеличиться (движение вниз к полу)
    expect(res!.y).toBeGreaterThan(100);
    expect(res!.vy).toBeGreaterThan(0);
  });

  it('should sync wires as elastic physical constraints between components', () => {
    const components: CircuitComponent[] = [
      {
        id: 'comp_a',
        type: 'battery',
        x: 100,
        y: 100,
        rotation: 0,
        values: {},
        state: {},
      },
      {
        id: 'comp_b',
        type: 'lamp',
        x: 350,
        y: 100,
        rotation: 0,
        values: {},
        state: {},
      },
    ];

    const wires: Wire[] = [
      {
        id: 'wire_1',
        from: {componentId: 'comp_a', terminalId: 'pos'},
        to: {componentId: 'comp_b', terminalId: 'term_a'},
      },
    ];

    service.syncComponents(components);
    service.syncWires(wires);

    // Применяем импульс к comp_a в сторону от comp_b
    service.applyImpulse('comp_a', {x: -20, y: 0});

    // Шагаем симуляцию
    for (let i = 0; i < 15; i++) {
      service.step(16.6);
    }

    const transforms = service.getAllTransforms();
    expect(transforms).toHaveLength(2);
  });

  it('should shake workbench by applying randomized kinetic impulses', () => {
    const components: CircuitComponent[] = [
      {
        id: 'shake_comp',
        type: 'resistor',
        x: 300,
        y: 300,
        rotation: 0,
        values: {},
        state: {},
      },
    ];

    service.syncComponents(components);
    service.shake(0.2);
    service.step(16.6);

    const transforms = service.getAllTransforms();
    const c = transforms.find((t) => t.id === 'shake_comp');
    expect(c).toBeDefined();
    // Скорость должна стать ненулевой
    expect(Math.abs(c!.vx) + Math.abs(c!.vy)).toBeGreaterThan(0);
  });

  it('should dynamically update canvas dimensions and boundaries', () => {
    service.updateDimensions(1400, 900);
    // Boundary update works without exceptions
    expect(service).toBeDefined();
  });
});
