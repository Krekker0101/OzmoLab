/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Photo-to-Circuit Lab Agent — Netlist Schema & Conversion Utilities
 * Validated with Zod for robust interop between perception, solver, and UI.
 */

import {z} from 'zod';
import {MNACircuit, MNAElement, MNAElementType} from '../solver/types.ts';

export const ComponentTypeSchema = z.enum([
  'battery',
  'resistor',
  'lamp',
  'led',
  'switch',
  'wire',
  'ammeter',
  'voltmeter',
  'unknown',
]);

export type NetlistComponentType = z.infer<typeof ComponentTypeSchema>;

export const BoundingBoxSchema = z.object({
  ymin: z.number().min(0).max(1000),
  xmin: z.number().min(0).max(1000),
  ymax: z.number().min(0).max(1000),
  xmax: z.number().min(0).max(1000),
  confidence: z.number().min(0).max(1).optional(),
});

export type NetlistBoundingBox = z.infer<typeof BoundingBoxSchema>;

export const NetlistComponentSchema = z.object({
  id: z.string().min(1),
  type: ComponentTypeSchema,
  nodeA: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  nodeB: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  value: z.number().optional(),
  internalResistance: z.number().optional(),
  isOpen: z.boolean().optional(),
  forwardVoltage: z.number().optional(),
  maxCurrent: z.number().optional(),
  maxPower: z.number().optional(),
  ratedCurrent: z.number().optional(),
  label: z.string().optional(),
  boundingBox: BoundingBoxSchema.optional(),
  confidence: z
    .preprocess((v) => (typeof v === 'number' && v > 1 ? Math.min(1, v / 100) : v), z.number().optional())
    .optional(),
});

export type NetlistComponent = z.infer<typeof NetlistComponentSchema>;

export const NetlistCircuitSchema = z
  .object({
    circuitId: z.string().optional(),
    isCircuit: z.boolean().optional(),
    components: z.array(NetlistComponentSchema).default([]),
    groundNode: z.string().optional(),
    message: z.string().optional(),
    metadata: z
      .object({
        source: z.enum(['photo', 'manual', 'agent_fix', 'preset']).optional(),
        description: z.string().optional(),
        detectedAt: z.number().optional(),
        modelId: z.string().optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.isCircuit === false) return true;
      return data.components && data.components.length > 0;
    },
    {
      message: 'Circuit must contain at least one component',
      path: ['components'],
    },
  );

export type NetlistCircuit = z.infer<typeof NetlistCircuitSchema>;

/**
 * Validates untrusted JSON/object into a validated NetlistCircuit.
 * Returns either parsed circuit or descriptive validation errors.
 */
export function validateNetlist(input: unknown): {
  success: boolean;
  data?: NetlistCircuit;
  error?: string;
  issues?: z.ZodIssue[];
} {
  const parseResult = NetlistCircuitSchema.safeParse(input);
  if (parseResult.success) {
    return {success: true, data: parseResult.data};
  }
  const errorMsg = parseResult.error.issues
    .map((issue) => `[${issue.path.join('.') || 'root'}]: ${issue.message}`)
    .join('; ');
  return {
    success: false,
    error: errorMsg,
    issues: parseResult.error.issues,
  };
}

/**
 * Converts a validated NetlistCircuit to MNACircuit for physical solving.
 */
export function convertNetlistToMNACircuit(netlist: NetlistCircuit): MNACircuit {
  const elements: MNAElement[] = netlist.components.map((comp) => {
    return {
      id: comp.id,
      type: comp.type as MNAElementType,
      nodeA: comp.nodeA,
      nodeB: comp.nodeB,
      value: comp.value,
      internalResistance: comp.internalResistance,
      isOpen: comp.isOpen,
      forwardVoltage: comp.forwardVoltage,
      maxCurrent: comp.maxCurrent,
      maxPower: comp.maxPower,
      ratedCurrent: comp.ratedCurrent,
    };
  });

  return {
    elements,
    groundNode: netlist.groundNode,
  };
}

/**
 * Converts an MNACircuit back to a NetlistCircuit.
 */
export function convertMNACircuitToNetlist(
  mnaCircuit: MNACircuit,
  metadata?: NetlistCircuit['metadata'],
): NetlistCircuit {
  const components: NetlistComponent[] = (mnaCircuit.elements || []).map((el) => ({
    id: el.id,
    type: el.type,
    nodeA: el.nodeA,
    nodeB: el.nodeB,
    value: el.value,
    internalResistance: el.internalResistance,
    isOpen: el.isOpen,
    forwardVoltage: el.forwardVoltage,
    maxCurrent: el.maxCurrent,
    maxPower: el.maxPower,
    ratedCurrent: el.ratedCurrent,
  }));

  return {
    components,
    groundNode: mnaCircuit.groundNode,
    metadata,
  };
}
