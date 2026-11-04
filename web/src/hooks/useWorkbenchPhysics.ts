/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — React-хук для подключения монтажного стола к физическому движку (useWorkbenchPhysics)
 * Интегрирует объекты WorkbenchCanvas с Matter.js в реальном времени.
 */

import {useState, useEffect, useRef, useCallback} from 'react';
import {useLabStore} from '../store/useLabStore.ts';
import {
  WorkbenchPhysicsService,
  PhysicsServiceConfig,
} from '../services/physicsEngine.ts';

export interface UseWorkbenchPhysicsOptions {
  containerWidth: number;
  containerHeight: number;
  draggingCompId?: string | null;
  initialEnabled?: boolean;
  initialGravity?: boolean;
}

export function useWorkbenchPhysics({
  containerWidth,
  containerHeight,
  draggingCompId = null,
  initialEnabled = false,
  initialGravity = false,
}: UseWorkbenchPhysicsOptions) {
  const {components, wires, updateComponentsPhysics} = useLabStore();

  const [isPhysicsActive, setIsPhysicsActive] = useState<boolean>(initialEnabled);
  const [isGravityEnabled, setIsGravityEnabled] = useState<boolean>(initialGravity);
  const [wireTethersEnabled, setWireTethersEnabled] = useState<boolean>(true);
  const [restitution, setRestitutionState] = useState<number>(0.35);

  const physicsRef = useRef<WorkbenchPhysicsService | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // 1. Инициализация сервиса физического движка
  useEffect(() => {
    const config: PhysicsServiceConfig = {
      width: containerWidth || 800,
      height: containerHeight || 600,
      gravityY: initialGravity ? 1 : 0,
      restitution: 0.35,
      enableWireTethers: true,
    };

    const service = new WorkbenchPhysicsService(config);
    physicsRef.current = service;

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      service.destroy();
      physicsRef.current = null;
    };
  }, []);

  // 2. Обновление габаритов при изменении размеров холста
  useEffect(() => {
    if (physicsRef.current && containerWidth > 0 && containerHeight > 0) {
      physicsRef.current.updateDimensions(containerWidth, containerHeight);
    }
  }, [containerWidth, containerHeight]);

  // 3. Синхронизация компонентов и проводов с телами Matter.js
  useEffect(() => {
    if (!physicsRef.current) return;
    physicsRef.current.syncComponents(components, draggingCompId);
    physicsRef.current.syncWires(wires);
  }, [components, wires, draggingCompId]);

  // 4. Физический цикл симуляции через requestAnimationFrame
  useEffect(() => {
    if (!isPhysicsActive) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (currentTime: number) => {
      const deltaMs = Math.min(32, currentTime - lastTimeRef.current);
      lastTimeRef.current = currentTime;

      const service = physicsRef.current;
      if (service) {
        service.step(deltaMs);
        const transforms = service.getAllTransforms();

        // Не перезаписываем координаты для объекта, который пользователь тащит мышью
        const updates = transforms
          .filter((t) => t.id !== draggingCompId)
          .map((t) => ({
            id: t.id,
            x: t.x,
            y: t.y,
            rotation: t.rotation,
          }));

        if (updates.length > 0) {
          updateComponentsPhysics(updates);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPhysicsActive, draggingCompId, updateComponentsPhysics]);

  // Переключение физики
  const togglePhysics = useCallback(() => {
    setIsPhysicsActive((prev) => {
      const next = !prev;
      // Если включаем физику, актуализируем текущие координаты компонентов
      if (next && physicsRef.current) {
        physicsRef.current.syncComponents(components, null);
      }
      return next;
    });
  }, [components]);

  // Переключение гравитации
  const toggleGravity = useCallback(() => {
    setIsGravityEnabled((prev) => {
      const next = !prev;
      if (physicsRef.current) {
        physicsRef.current.setGravity(next, 1.2);
      }
      return next;
    });
  }, []);

  // Переключение связей проводов
  const toggleWireTethers = useCallback(() => {
    setWireTethersEnabled((prev) => {
      const next = !prev;
      if (physicsRef.current) {
        physicsRef.current.setWireTethers(next);
      }
      return next;
    });
  }, []);

  // Встряхивание монтажного стола
  const shakeWorkbench = useCallback((magnitude: number = 0.08) => {
    if (physicsRef.current) {
      physicsRef.current.shake(magnitude);
    }
  }, []);

  // Применение импульса к объекту
  const applyImpulse = useCallback((compId: string, force: {x: number; y: number}) => {
    if (physicsRef.current) {
      physicsRef.current.applyImpulse(compId, force);
    }
  }, []);

  // Настройка упругости отскока
  const setRestitution = useCallback((val: number) => {
    setRestitutionState(val);
    if (physicsRef.current) {
      physicsRef.current.setRestitution(val);
    }
  }, []);

  // Обработка перетаскивания компонента пользователем
  const onDragMove = useCallback((compId: string, x: number, y: number, angleDeg?: number) => {
    if (physicsRef.current) {
      physicsRef.current.setComponentPosition(compId, x, y, angleDeg);
    }
  }, []);

  return {
    isPhysicsActive,
    setIsPhysicsActive,
    togglePhysics,
    isGravityEnabled,
    setIsGravityEnabled,
    toggleGravity,
    wireTethersEnabled,
    toggleWireTethers,
    shakeWorkbench,
    applyImpulse,
    restitution,
    setRestitution,
    onDragMove,
    physicsEngineRef: physicsRef,
  };
}
