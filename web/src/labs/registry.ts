/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Реестр плагинов лабораторий (Lab Registry)
 * Реализует паттерн плагинной архитектуры (Open-Closed Principle).
 * Добавление новой лаборатории не требует изменения ядра приложения.
 */

import {LabModule} from '../../../shared/types.ts';
import {CircuitsDCModule} from './circuits-dc/index.ts';

class LabRegistryImpl {
  private modules: Map<string, LabModule> = new Map();
  private defaultLabId: string | null = null;

  constructor() {
    this.register(CircuitsDCModule, true);
  }

  /**
   * Регистрирует новый модуль лаборатории.
   */
  public register(module: LabModule, isDefault: boolean = false): void {
    if (this.modules.has(module.id)) {
      console.warn(`[LabRegistry] Overwriting existing lab module: ${module.id}`);
    }
    this.modules.set(module.id, module);

    if (isDefault || !this.defaultLabId) {
      this.defaultLabId = module.id;
    }
  }

  /**
   * Возвращает модуль лаборатории по идентификатору.
   */
  public get(id: string): LabModule | undefined {
    return this.modules.get(id);
  }

  /**
   * Возвращает список всех зарегистрированных лабораторий.
   */
  public getAll(): LabModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Возвращает идентификаторы всех зарегистрированных лабораторий.
   */
  public getIds(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Возвращает дефолтную лабораторию (первую зарегистрированную).
   */
  public getDefault(): LabModule {
    if (this.defaultLabId && this.modules.has(this.defaultLabId)) {
      return this.modules.get(this.defaultLabId)!;
    }

    const first = this.modules.values().next().value;
    if (first) {
      return first;
    }

    throw new Error('[LabRegistry] No lab modules registered in the system');
  }
}

export const LabRegistry = new LabRegistryImpl();
