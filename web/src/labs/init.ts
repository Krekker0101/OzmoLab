/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Инициализация плагинов лабораторий
 */

import {CircuitsDCModule} from './circuits-dc/index.ts';
import {OpticsGeometricModule} from './optics-geometric/index.ts';
import {BiologyMicroscopyModule} from './biology-microscopy/index.ts';
import {LabRegistry} from './registry.ts';

export function initializeLabModules(): void {
  // Регистрируем стартовые модули если они ещё не добавлены
  if (!LabRegistry.get('circuits-dc')) {
    LabRegistry.register(CircuitsDCModule, true);
  }
  if (!LabRegistry.get('optics-geometric')) {
    LabRegistry.register(OpticsGeometricModule, false);
  }
  if (!LabRegistry.get('biology-microscopy')) {
    LabRegistry.register(BiologyMicroscopyModule, false);
  }
}

// Вызываем автоматически при загрузке модуля
initializeLabModules();
