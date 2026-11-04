/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Notebook Photo Router & Physics Problem Schemas
 * Meta Global AI Developer Hackathon (Indie Developer Track: "Build for Your World")
 */

import {z} from 'zod';
import {NetlistCircuitSchema} from './netlist.ts';

export const PhotoCategorySchema = z.enum([
  'circuit',
  'supported_problem',
  'other_notes',
  'not_readable',
]);

export type PhotoCategory = z.infer<typeof PhotoCategorySchema>;

export const SupportedProblemTypeSchema = z.enum([
  'centre_of_mass',
  'resistance_circuit',
]);

export type SupportedProblemType = z.infer<typeof SupportedProblemTypeSchema>;

export const PhotoClassificationSchema = z.object({
  category: PhotoCategorySchema,
  confidence: z.number().min(0).max(1),
  detectedLanguage: z.enum(['en', 'tg', 'ru', 'bn', 'mixed', 'other']),
  summary: z.string(),
  problemType: SupportedProblemTypeSchema.nullable().optional(),
});

export type PhotoClassification = z.infer<typeof PhotoClassificationSchema>;

export const PointMassSchema = z.object({
  id: z.string().min(1),
  mass: z.number().positive(),
  x: z.number(),
  y: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  rawLabel: z.string().optional(),
});

export type PointMass = z.infer<typeof PointMassSchema>;

export const CentreOfMassProblemSchema = z.object({
  dimension: z.enum(['1D', '2D']),
  variableSymbol: z.string().optional(), // e.g. "d" or "a"
  items: z.array(PointMassSchema).min(2, 'At least 2 point masses are required'),
  title: z.string().optional(),
});

export type CentreOfMassProblem = z.infer<typeof CentreOfMassProblemSchema>;

export const ResistanceProblemSchema = z.object({
  topology: z.enum(['series', 'parallel', 'mixed']),
  voltage: z.number().optional(),
  resistors: z.array(
    z.object({
      id: z.string().min(1),
      resistance: z.number().positive(),
      confidence: z.number().min(0).max(1).optional(),
    }),
  ).min(1),
  target: z.enum(['total_resistance', 'current', 'voltage']),
});

export type ResistanceProblem = z.infer<typeof ResistanceProblemSchema>;

export const NotebookExtractionResultSchema = z.object({
  classification: PhotoClassificationSchema,
  centreOfMass: CentreOfMassProblemSchema.optional(),
  resistanceProblem: ResistanceProblemSchema.optional(),
  circuitNetlist: NetlistCircuitSchema.optional(),
  rawText: z.string().optional(),
  userGuidance: z.string().optional(),
  needsConfirmation: z.boolean().default(true),
  isConfident: z.boolean().default(true),
  modelUsed: z.string().optional(),
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  latencyMs: z.number().optional(),
  retried: z.boolean().optional(),
});

export type NotebookExtractionResult = z.infer<typeof NotebookExtractionResultSchema>;
