/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Zod-схема валидации входящих запросов к ИИ-наставнику
 */

import {z} from 'zod';

export const tutorRequestSchema = z.object({
  language: z.enum(['tg', 'ru']).default('tg'),
  message: z.string().trim().min(1, 'Сообщение не может быть пустым').max(500, 'Сообщение не должно превышать 500 символов'),
  actionType: z.enum(['chat', 'hint', 'check_circuit']).default('chat'),
  lessonId: z.string().max(100).optional().nullable(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(500),
      })
    )
    .max(10, 'История диалога не должна превышать 10 сообщений')
    .optional()
    .default([]),
  state: z
    .object({
      labId: z.string(),
      summaryText: z.string().max(1000),
      isCircuitComplete: z.boolean(),
      hasHazard: z.boolean(),
      activeComponentsCount: z.number().int().nonnegative(),
      connectionsCount: z.number().int().nonnegative(),
      components: z
        .array(
          z.object({
            id: z.string(),
            type: z.string(),
            parameters: z.record(z.string(), z.number()).optional(),
            measuredCurrent: z.number().optional(),
            measuredVoltage: z.number().optional(),
            stateText: z.string().max(200),
          })
        )
        .optional()
        .default([]),
      currentLessonStepId: z.string().optional(),
    })
    .optional(),
});

export type ValidatedTutorRequest = z.infer<typeof tutorRequestSchema>;
