/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Архитектурный контракт и фабрика модулей лабораторий (LabModule)
 */

import {
  AISummarySnapshot,
  ComponentDefinition,
  LabState,
  Lesson,
  SimulationResult,
} from '../types.ts';

/**
 * Научная дисциплина лаборатории
 */
export type LabDiscipline =
  | 'physics'
  | 'circuits'
  | 'optics'
  | 'biology'
  | 'chemistry'
  | 'astronomy';

/**
 * Метаданные лаборатории
 */
export interface LabMetadata {
  id: string;
  titleKey: string;
  descriptionKey: string;
  discipline: LabDiscipline;
  gradeLevels?: number[];
  tags?: string[];
  version?: string;
  author?: string;
  iconName?: string;
  difficulty?: 'easy' | 'medium' | 'advanced';
}

/**
 * Хук физического моделирования состояния монтажного стола
 */
export type PhysicsSimulationHook = (state: LabState) => SimulationResult;

/**
 * Хук генерации структурного описания состояния для ИИ-наставника
 */
export type AISummaryHook = (state: LabState) => AISummarySnapshot;

/**
 * Конфигурация для создания модуля лаборатории через фабрику
 */
export interface LabModuleConfig {
  id: string;
  titleKey: string;
  descriptionKey: string;
  discipline: LabDiscipline;
  metadata?: Partial<LabMetadata>;
  components: ComponentDefinition[];
  simulate: PhysicsSimulationHook;
  describeState?: AISummaryHook;
  lessons?: Lesson[];
  defaultState?: Partial<LabState>;
}

/**
 * Основной интерфейс модуля виртуальной лаборатории (LabModule)
 */
export interface LabModule {
  id: string;
  titleKey: string;
  descriptionKey: string;
  discipline: LabDiscipline;
  metadata?: LabMetadata;
  components: ComponentDefinition[];
  simulate: PhysicsSimulationHook;
  describeState: AISummaryHook;
  lessons: Lesson[];
  defaultState?: Partial<LabState>;
}

/**
 * Фабрика модулей лабораторий (LabModule factory)
 * Создает типобезопасный модуль с валидацией схемы и дефолтными реализациями опциональных хуков.
 */
export function createLabModule(config: LabModuleConfig): LabModule {
  if (!config.id || typeof config.id !== 'string') {
    throw new Error('[createLabModule] Lab module id is required and must be a string.');
  }
  if (!config.titleKey) {
    throw new Error(`[createLabModule] titleKey is required for lab module "${config.id}".`);
  }
  if (!config.discipline) {
    throw new Error(`[createLabModule] discipline is required for lab module "${config.id}".`);
  }
  if (typeof config.simulate !== 'function') {
    throw new Error(`[createLabModule] simulate hook is required for lab module "${config.id}".`);
  }

  const defaultDescribeState: AISummaryHook = (state: LabState): AISummarySnapshot => ({
    labId: config.id,
    summaryText: `Лаборатория ${config.id}: активных элементов ${state.components.length}, связей ${state.wires.length}.`,
    isCircuitComplete: state.components.length > 0,
    hasHazard: Boolean(state.simulationResult?.hasShortCircuit),
    activeComponentsCount: state.components.length,
    components: state.components.map((c) => ({
      id: c.id,
      type: c.type,
      parameters: c.values,
      stateText: 'active',
    })),
    connectionsCount: state.wires.length,
  });

  return {
    id: config.id,
    titleKey: config.titleKey,
    descriptionKey: config.descriptionKey,
    discipline: config.discipline,
    metadata: {
      id: config.id,
      titleKey: config.titleKey,
      descriptionKey: config.descriptionKey,
      discipline: config.discipline,
      ...config.metadata,
    },
    components: config.components || [],
    simulate: config.simulate,
    describeState: config.describeState || defaultDescribeState,
    lessons: config.lessons || [],
    defaultState: config.defaultState,
  };
}

export const defineLabModule = createLabModule;
