/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Photo-to-Circuit Lab Agent — Modified Nodal Analysis (MNA) Data Types
 */

export type MNAElementType =
  | 'battery'
  | 'resistor'
  | 'lamp'
  | 'led'
  | 'switch'
  | 'wire'
  | 'ammeter'
  | 'voltmeter'
  | 'unknown';

export interface MNAElement {
  id: string;
  type: MNAElementType;
  /** Primary / positive / anode terminal node identifier */
  nodeA: string;
  /** Secondary / negative / cathode terminal node identifier */
  nodeB: string;
  /**
   * Primary physical value:
   * - battery: EMF in Volts (e.g. 9.0)
   * - resistor / lamp: resistance in Ohms (e.g. 10.0)
   * - led: forward voltage in Volts (e.g. 2.0)
   */
  value?: number;
  /** Internal resistance in Ohms (e.g. 0.2 for real battery) */
  internalResistance?: number;
  /** Switch state (true = open / broken circuit, false = closed) */
  isOpen?: boolean;
  /** LED forward voltage threshold in Volts (default 2.0 V) */
  forwardVoltage?: number;
  /** Maximum safe current in Amperes before burnout (e.g. 0.05 A for 20mA LED) */
  maxCurrent?: number;
  /** Maximum safe power in Watts before bulb filament burns out */
  maxPower?: number;
  /** Rated current for full brightness (0..1 scaling) */
  ratedCurrent?: number;
}

export interface MNACircuit {
  elements: MNAElement[];
  /** Optional explicit ground node name (defaults to negative terminal of first battery, or "0", or "GND") */
  groundNode?: string;
}

export interface MNAElementResult {
  elementId: string;
  type: MNAElementType;
  nodeA: string;
  nodeB: string;
  voltageA: number;
  voltageB: number;
  voltageDrop: number; // V_A - V_B
  current: number; // A (entering nodeA, exiting nodeB)
  power: number; // W
  illuminated?: boolean;
  brightness?: number; // 0..1
  isBlown?: boolean;
  isConducting?: boolean;
  isReverseBiased?: boolean;
  status: 'normal' | 'active' | 'open' | 'overload' | 'blown' | 'reverse_bias';
}

export interface MNAWarning {
  code:
    | 'SHORT_CIRCUIT'
    | 'OPEN_CIRCUIT'
    | 'HIGH_CURRENT'
    | 'VOLTAGE_OVERLOAD'
    | 'LED_REVERSE_BIAS'
    | 'LED_BURNOUT_NO_RESISTOR'
    | 'BULB_BURNOUT'
    | 'UNKNOWN_COMPONENT'
    | 'METER_MISPLACED';
  message: string;
  elementId?: string;
}

export interface MNASolution {
  /** Node voltages relative to reference/ground (V) */
  nodeVoltages: Record<string, number>;
  /** Detailed per-element physical quantities and states */
  elementResults: Record<string, MNAElementResult>;
  /** Whether a closed loop with current flow exists */
  isClosedCircuit: boolean;
  /** Whether an uncontrolled low-resistance short circuit exists across a source */
  hasShortCircuit: boolean;
  /** Total current delivered by sources (A) */
  totalCurrent: number;
  /** Equivalent resistance seen by main source (Ohms) */
  totalEquivalentResistance: number;
  /** Warnings and diagnosed circuit anomalies */
  warnings: MNAWarning[];
  /** High-level operational summary status */
  status: 'ok' | 'short_circuit' | 'open_circuit' | 'overload' | 'burned_component';
}
