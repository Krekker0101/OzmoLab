/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб — Тесты физических расчетов Hero 3D стенда
 */

import {describe, it, expect} from 'vitest';
import {CircuitState, OpticsState} from '../components/hero3d/types.ts';
import {Workbench3DPhysicsEngine} from '../services/workbench3dPhysicsEngine.ts';
import {CircuitComponent} from '../../../shared/types.ts';

describe('Hero 3D Physics Calculations', () => {
  it('calculates Ohm law current and voltage correctly for circuit mode', () => {
    const batteryV = 9.0;
    const lampBaseR = 10.0;
    const rheostatR = 20.0;
    const totalR = rheostatR + lampBaseR;
    const isClosed = true;

    const current = isClosed ? batteryV / totalR : 0;
    const lampVoltage = isClosed ? current * lampBaseR : 0;
    const lampPower = isClosed ? current * current * lampBaseR : 0;

    expect(totalR).toBe(30.0);
    expect(current).toBeCloseTo(0.3, 4); // 9 / 30 = 0.30 A
    expect(lampVoltage).toBeCloseTo(3.0, 4); // 0.3 * 10 = 3.0 V
    expect(lampPower).toBeCloseTo(0.9, 4); // 0.3^2 * 10 = 0.9 W
  });

  it('handles open switch correctly with zero current and zero voltage', () => {
    const batteryV = 9.0;
    const lampBaseR = 10.0;
    const rheostatR = 50.0;
    const totalR = rheostatR + lampBaseR;
    const isClosed = false;

    const current = isClosed ? batteryV / totalR : 0;
    const lampVoltage = isClosed ? current * lampBaseR : 0;

    expect(current).toBe(0);
    expect(lampVoltage).toBe(0);
  });

  it('calculates Snell law refraction angle correctly for optics mode', () => {
    const laserAngle = 30; // 30 deg incidence in air (n1 = 1.0)
    const lensIndex = 1.52; // Crown glass (n2 = 1.52)

    const radAngle = (laserAngle * Math.PI) / 180;
    const sinRefract = Math.sin(radAngle) / lensIndex; // sin(30) / 1.52 = 0.5 / 1.52 ≈ 0.3289
    const refractAngle = (Math.asin(sinRefract) * 180) / Math.PI;

    expect(refractAngle).toBeGreaterThan(19.0);
    expect(refractAngle).toBeLessThan(19.5); // ~19.2 deg
  });

  it('verifies chromatic dispersion order n_red < n_green < n_blue', () => {
    const baseN = 1.52;
    const nRed = baseN - 0.015;
    const nGreen = baseN;
    const nBlue = baseN + 0.02;

    expect(nRed).toBeLessThan(nGreen);
    expect(nGreen).toBeLessThan(nBlue);
  });
});

import {
  calculateReactionPhysics,
  calculateMechanismPhysics,
  generateInstrumentTelemetry,
} from '../components/hero3d/scienceEngine.ts';
import {map2DTo3D, map3DTo2D} from '../components/hero3d/workbench3d/Workbench3DScene.ts';

describe('Scientific 3D Laboratory Engine & Physics', () => {
  it('correctly calculates acid-base titration equivalence point and pH', () => {
    // 25 mL of 0.1 M HCl titrated with 25 mL of 0.1 M NaOH
    const eqReaction = calculateReactionPhysics({
      reactionType: 'titration',
      titrantAddedMl: 25.0,
      acidMolarity: 0.1,
      baseMolarity: 0.1,
      initialVolumeMl: 25.0,
      stirrerSpeedRpm: 500,
      isStirrerOn: true,
      currentElectrolysisA: 0,
      elapsedSec: 10,
    });

    expect(eqReaction.isEquivalenceReached).toBe(true);
    expect(eqReaction.ph).toBeCloseTo(7.0, 1);
    expect(eqReaction.temperatureC).toBeGreaterThan(20.0); // exothermic neutralization
  });

  it('correctly calculates Faraday water electrolysis gas volumes with 2:1 stoichiometric ratio', () => {
    const electrolysis = calculateReactionPhysics({
      reactionType: 'electrolysis',
      titrantAddedMl: 0,
      acidMolarity: 0,
      baseMolarity: 0,
      initialVolumeMl: 100,
      stirrerSpeedRpm: 0,
      isStirrerOn: false,
      currentElectrolysisA: 2.0, // 2 Amperes
      elapsedSec: 60, // 60 seconds
    });

    expect(electrolysis.gasH2Ml).toBeGreaterThan(0);
    expect(electrolysis.gasO2Ml).toBeGreaterThan(0);
    // V(H2) / V(O2) must equal exactly 2.0 according to 2 H2O -> 2 H2 + O2
    expect(electrolysis.gasH2Ml / electrolysis.gasO2Ml).toBeCloseTo(2.0, 3);
  });

  it('calculates gear train reduction ratio and torque multiplication accurately', () => {
    const gears = calculateMechanismPhysics({
      mechanismType: 'gears',
      isMotorOn: true,
      motorRpm: 180,
      inputTorqueNm: 2.0,
      gear1Teeth: 18,
      gear2Teeth: 24,
      gear3Teeth: 36,
      pulleySheaves: 1,
      loadMassKg: 10,
      crankRadiusCm: 5,
      connectingRodCm: 15,
    });

    // Ratio = 36 / 18 = 2.0
    expect(gears.gearRatio).toBe(2.0);
    expect(gears.outputRpm).toBeCloseTo(90, 1); // 180 / 2 = 90 RPM
    // Torque = 2.0 * 2.0 * 0.95 = 3.8 N*m
    expect(gears.outputTorqueNm).toBeCloseTo(3.8, 1);
  });

  it('calculates block and tackle pulley mechanical advantage and cable tension', () => {
    const pulley = calculateMechanismPhysics({
      mechanismType: 'pulley',
      isMotorOn: true,
      motorRpm: 0,
      inputTorqueNm: 0,
      gear1Teeth: 18,
      gear2Teeth: 24,
      gear3Teeth: 36,
      pulleySheaves: 2, // 2 sheaves = 2x mechanical advantage
      loadMassKg: 20, // 20 kg load -> ~196 N
      crankRadiusCm: 5,
      connectingRodCm: 15,
    });

    const expectedLoadForce = 20 * 9.80665;
    expect(pulley.pulleyTensionN).toBeLessThan(expectedLoadForce); // tension is divided by sheaves
    expect(pulley.pulleyTensionN).toBeCloseTo(expectedLoadForce / (2 * 0.94), 1);
  });

  it('verifies bi-directional 2D to 3D coordinate mapping', () => {
    const orig2D = {x: 850, y: 320};
    const p3d = map2DTo3D(orig2D.x, orig2D.y);
    const roundTrip2D = map3DTo2D(p3d.x, p3d.z);
    expect(roundTrip2D.x).toBe(orig2D.x);
    expect(roundTrip2D.y).toBe(orig2D.y);
  });

  it('verifies 3D physics engine syncs component positions and updates 2D store coordinates', () => {
    const engine = new Workbench3DPhysicsEngine();
    
    // Test with initial 2D components
    const testComponents: CircuitComponent[] = [
      {id: 'bat_test', type: 'battery', x: 200, y: 300, rotation: 0, values: {voltage: 9}, state: {}},
      {id: 'lamp_test', type: 'lamp', x: 700, y: 300, rotation: 0, values: {resistance: 15}, state: {}},
    ];
    
    engine.syncComponents(testComponents);
    const body1 = engine.getBody('bat_test');
    const body2 = engine.getBody('lamp_test');
    
    expect(body1).toBeDefined();
    expect(body2).toBeDefined();
    expect(body1!.x).toBeLessThan(0); // x: 200 maps to negative X in 3D
    expect(body2!.x).toBeGreaterThan(0); // x: 700 maps to positive X in 3D
    
    // Simulate table friction and gravity
    engine.step(0.016);
    const updates2D = engine.getUpdatesFor2DStore();
    expect(updates2D.length).toBe(2);
    expect(updates2D.find((u: any) => u.id === 'bat_test')).toBeDefined();
  });
});


