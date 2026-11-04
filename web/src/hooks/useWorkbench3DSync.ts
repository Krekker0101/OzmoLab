/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Хук синхронизации состояния 2D верстака в 3D сцену (useWorkbench3DSync)
 * Автоматически отображает добавленные в 2D компоненты в 3D с точными физическими
 * характеристиками (масса, габариты, клеммы, упругость, электрические параметры).
 */

import {useEffect, useRef, useMemo, useCallback} from 'react';
import * as THREE from 'three';
import {useLabStore} from '../store/useLabStore.ts';
import {CircuitComponent, SimulationResult, Wire} from '../../../shared/types.ts';
import {
  createComponent3DMesh,
  ComponentMeshHandle,
} from '../components/hero3d/workbench3d/WorkbenchComponentMeshes.ts';
import {
  createWorkbenchWireSystem,
  WireMeshHandle,
} from '../components/hero3d/workbench3d/WorkbenchWireMeshes.ts';
import {Workbench3DPhysicsEngine} from '../services/workbench3dPhysicsEngine.ts';
import {map2DTo3D, map3DTo2D} from '../components/hero3d/workbench3d/Workbench3DScene.ts';

export interface ComponentPhysicalAttributes {
  type: string;
  mass: number;
  radius: number;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  restitution: number;
  friction: number;
  elevationY: number;
  terminals: Record<string, {x: number; y: number; z: number}>;
  electricalState: {
    voltage: number;
    current: number;
    resistance: number;
    power: number;
    status: 'normal' | 'overload' | 'open' | 'active';
    brightness: number;
    needleDeflectionRad: number;
    isOpen: boolean;
  };
}

export interface Synced3DComponentItem {
  id: string;
  component: CircuitComponent;
  pos3D: {x: number; y: number; z: number};
  rotationYRad: number;
  rotationDeg: number;
  physicalAttributes: ComponentPhysicalAttributes;
  isSelected: boolean;
}

export interface UseWorkbench3DSyncOptions {
  scene: THREE.Scene | null;
  isLight?: boolean;
  isPhysicsActive?: boolean;
  isGravityEnabled?: boolean;
  isWireSpringsEnabled?: boolean;
  draggedCompId?: string | null;
}

/**
 * Вычисляет физические и геометрические атрибуты электрического компонента для 3D симуляции
 */
export function computePhysicalAttributes(
  comp: CircuitComponent,
  simResult: SimulationResult | null
): ComponentPhysicalAttributes {
  const type = comp.type;
  const values = comp.values || {};
  const compState = simResult?.componentStates?.[comp.id];

  const current = compState?.current ?? 0;
  const voltage = compState?.voltageDrop ?? (type === 'battery' ? values.voltage || 9 : 0);
  const resistance = values.resistance || (type === 'lamp' ? 10 : type === 'resistor' ? 20 : 0.01);
  const power = compState?.power ?? current * voltage;
  const status = compState?.status ?? (current > 0 ? 'active' : 'normal');

  // Расчет яркости лампы от тока (0..1)
  const nominalCurrent = (values.voltage || 9) / Math.max(1, resistance);
  const brightness = type === 'lamp' && current > 0 ? Math.min(1.5, Math.pow(current / nominalCurrent, 1.8)) : 0;

  // Расчет отклонения стрелки вольтметра/амперметра
  let needleDeflectionRad = 0;
  if (type === 'voltmeter') {
    const maxV = 15;
    const norm = Math.max(0, Math.min(1, Math.abs(voltage) / maxV));
    needleDeflectionRad = 0.74 - norm * 1.48; // от крайнего левого (+0.74) к правому (-0.74)
  } else if (type === 'ammeter') {
    const maxA = 2.0;
    const norm = Math.max(0, Math.min(1, Math.abs(current) / maxA));
    needleDeflectionRad = 0.74 - norm * 1.48;
  }

  const isOpen = type === 'switch' ? Boolean(comp.state?.isOpen) : false;

  switch (type) {
    case 'voltmeter':
      return {
        type,
        mass: 2.2,
        radius: 1.1,
        dimensions: {width: 1.9, height: 1.3, depth: 1.7},
        restitution: 0.3,
        friction: 0.88,
        elevationY: 0.65,
        terminals: {
          term_a: {x: -0.68, y: 0.22, z: 0.65}, // Отрицательная клемма (черная)
          term_b: {x: 0.68, y: 0.22, z: 0.65}, // Положительная клемма (красная)
        },
        electricalState: {
          voltage,
          current,
          resistance: 100000,
          power,
          status,
          brightness: 0,
          needleDeflectionRad,
          isOpen: false,
        },
      };

    case 'ammeter':
      return {
        type,
        mass: 2.2,
        radius: 1.1,
        dimensions: {width: 1.9, height: 1.3, depth: 1.7},
        restitution: 0.3,
        friction: 0.88,
        elevationY: 0.65,
        terminals: {
          term_a: {x: -0.68, y: 0.22, z: 0.65},
          term_b: {x: 0.68, y: 0.22, z: 0.65},
        },
        electricalState: {
          voltage,
          current,
          resistance: 0.05,
          power,
          status,
          brightness: 0,
          needleDeflectionRad,
          isOpen: false,
        },
      };

    case 'battery':
    case 'powersource_dc':
      return {
        type,
        mass: 3.5,
        radius: 1.2,
        dimensions: {width: 2.2, height: 1.2, depth: 1.8},
        restitution: 0.25,
        friction: 0.9,
        elevationY: 0.6,
        terminals: {
          positive: {x: 0.55, y: 0.6, z: 0},
          negative: {x: -0.55, y: 0.6, z: 0},
        },
        electricalState: {
          voltage: values.voltage || 9,
          current,
          resistance: values.internalResistance || 0.1,
          power,
          status,
          brightness: 0,
          needleDeflectionRad: 0,
          isOpen: false,
        },
      };

    case 'lamp':
      return {
        type,
        mass: 0.8,
        radius: 0.7,
        dimensions: {width: 1.3, height: 1.1, depth: 1.3},
        restitution: 0.45,
        friction: 0.8,
        elevationY: 0.55,
        terminals: {
          terminal_a: {x: -0.45, y: 0.18, z: 0},
          terminal_b: {x: 0.45, y: 0.18, z: 0},
        },
        electricalState: {
          voltage,
          current,
          resistance,
          power,
          status,
          brightness,
          needleDeflectionRad: 0,
          isOpen: false,
        },
      };

    case 'switch':
      return {
        type,
        mass: 0.9,
        radius: 0.75,
        dimensions: {width: 1.4, height: 0.7, depth: 0.9},
        restitution: 0.35,
        friction: 0.85,
        elevationY: 0.35,
        terminals: {
          terminal_a: {x: -0.5, y: 0.15, z: 0},
          terminal_b: {x: 0.5, y: 0.15, z: 0},
        },
        electricalState: {
          voltage,
          current,
          resistance: isOpen ? 1e9 : 0.01,
          power,
          status,
          brightness: 0,
          needleDeflectionRad: 0,
          isOpen,
        },
      };

    case 'rheostat':
    case 'potentiometer':
      return {
        type,
        mass: 1.8,
        radius: 1.2,
        dimensions: {width: 2.4, height: 0.9, depth: 1.0},
        restitution: 0.3,
        friction: 0.85,
        elevationY: 0.45,
        terminals: {
          terminal_a: {x: -0.9, y: 0.2, z: 0},
          terminal_b: {x: 0.9, y: 0.2, z: 0},
          wiper: {x: 0, y: 0.45, z: 0},
        },
        electricalState: {
          voltage,
          current,
          resistance,
          power,
          status,
          brightness: 0,
          needleDeflectionRad: 0,
          isOpen: false,
        },
      };

    case 'resistor':
    default:
      return {
        type,
        mass: 0.7,
        radius: 0.65,
        dimensions: {width: 1.2, height: 0.6, depth: 0.8},
        restitution: 0.4,
        friction: 0.82,
        elevationY: 0.3,
        terminals: {
          terminal_a: {x: -0.45, y: 0.18, z: 0},
          terminal_b: {x: 0.45, y: 0.18, z: 0},
        },
        electricalState: {
          voltage,
          current,
          resistance,
          power,
          status,
          brightness: 0,
          needleDeflectionRad: 0,
          isOpen: false,
        },
      };
  }
}

/**
 * Хук синхронизации 2D верстака в Three.js 3D окружение
 */
export function useWorkbench3DSync({
  scene,
  isLight = false,
  isPhysicsActive = true,
  isGravityEnabled = true,
  isWireSpringsEnabled = true,
  draggedCompId = null,
}: UseWorkbench3DSyncOptions) {
  const {
    components,
    wires,
    simulationResult,
    selectedComponentId,
    updateComponentsPhysics,
    toggleSwitch,
    selectComponent,
  } = useLabStore();

  const physicsEngineRef = useRef<Workbench3DPhysicsEngine>(
    new Workbench3DPhysicsEngine({
      tableHalfWidth: 5.8,
      tableHalfDepth: 3.8,
      gravityY: isGravityEnabled ? -9.81 : 0,
      defaultRestitution: 0.35,
      enableWireSprings: isWireSpringsEnabled,
    })
  );

  const compHandlesRef = useRef<Map<string, ComponentMeshHandle>>(new Map());
  const wireSystemRef = useRef<WireMeshHandle | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  // 1. Привязка системы проводов к Three.js сцене
  useEffect(() => {
    if (!scene) return;
    const wireSystem = createWorkbenchWireSystem();
    wireSystemRef.current = wireSystem;
    scene.add(wireSystem.group);

    return () => {
      scene.remove(wireSystem.group);
      wireSystem.dispose();
      wireSystemRef.current = null;
    };
  }, [scene]);

  // 2. Синхронизация параметров физического движка
  useEffect(() => {
    const physics = physicsEngineRef.current;
    physics.setSimulationActive(isPhysicsActive);
    physics.setGravityActive(isGravityEnabled);
    physics.setWireSpringsActive(isWireSpringsEnabled);
  }, [isPhysicsActive, isGravityEnabled, isWireSpringsEnabled]);

  // 3. Автоматическое добавление / удаление компонентов в 3D сцену при изменениях в 2D верстаке
  useEffect(() => {
    if (!scene) return;
    const physics = physicsEngineRef.current;

    // Синхронизируем физические тела
    physics.syncComponents(components, draggedCompId);
    physics.syncWires(wires);

    const activeCompIds = new Set(components.map((c) => c.id));

    // Удаляем из 3D сцены компоненты, удаленные в 2D
    for (const [id, handle] of Array.from(compHandlesRef.current.entries())) {
      if (!activeCompIds.has(id)) {
        scene.remove(handle.group);
        handle.dispose();
        compHandlesRef.current.delete(id);
      }
    }

    // Добавляем в 3D сцену компоненты, появившиеся в 2D
    for (const comp of components) {
      if (!compHandlesRef.current.has(comp.id)) {
        // Создаем детализированный 3D меш с PBR материалами
        const handle = createComponent3DMesh(comp, isLight);
        handle.group.name = `comp_3d_${comp.id}`;

        // Начальная позиция из 2D координат
        const {x: initX, z: initZ} = map2DTo3D(comp.x, comp.y);
        const physAttrs = computePhysicalAttributes(comp, simulationResult);
        handle.group.position.set(initX, physAttrs.elevationY, initZ);
        handle.group.rotation.y = ((comp.rotation || 0) * Math.PI) / 180;

        scene.add(handle.group);
        compHandlesRef.current.set(comp.id, handle);
      }
    }
  }, [components, wires, scene, isLight, draggedCompId, simulationResult]);

  // 4. Расчет физических атрибутов для экспорта в React UI
  const syncedComponents: Synced3DComponentItem[] = useMemo(() => {
    return components.map((comp) => {
      const {x, z} = map2DTo3D(comp.x, comp.y);
      const attrs = computePhysicalAttributes(comp, simulationResult);
      return {
        id: comp.id,
        component: comp,
        pos3D: {x, y: attrs.elevationY, z},
        rotationYRad: ((comp.rotation || 0) * Math.PI) / 180,
        rotationDeg: comp.rotation || 0,
        physicalAttributes: attrs,
        isSelected: comp.id === selectedComponentId,
      };
    });
  }, [components, simulationResult, selectedComponentId]);

  // 5. Метод выполнения одного шага физики и обновления 3D мешей и проводов
  const stepPhysics = useCallback(
    (dt: number) => {
      const physics = physicsEngineRef.current;
      const wireSystem = wireSystemRef.current;
      if (!physics) return;

      // Шаг физического движка
      physics.step(dt);

      const terminalWorldPositions = new Map<string, THREE.Vector3>();
      const compMap = new Map(components.map((c) => [c.id, c]));
      const now = performance.now();

      // Обновление положения мешей и анимации элементов
      for (const [id, handle] of compHandlesRef.current.entries()) {
        const body = physics.getBody(id);
        const comp = compMap.get(id);
        if (!body || !comp) continue;

        handle.group.position.set(body.x, body.y, body.z);
        handle.group.rotation.y = body.rotationY;

        // Обновляем визуальное состояние (стрелки, свечение лампы, нож рубильника)
        handle.updateState(comp, simulationResult, now / 1000);

        // Получаем мировые координаты клемм для системы проводов
        handle.terminals.forEach((localPos, termKey) => {
          const worldPos = localPos.clone().applyMatrix4(handle.group.matrixWorld);
          terminalWorldPositions.set(`${comp.id}:${termKey}`, worldPos);
        });
      }

      // Обновляем провода и частицы тока
      if (wireSystem) {
        wireSystem.updateWires(wires, terminalWorldPositions, dt);
      }

      // Двусторонняя синхронизация: отправка координат в 2D store (~25 FPS)
      if (now - lastSyncTimeRef.current > 40 && physics.isSimulationRunning()) {
        const updates = physics.getUpdatesFor2DStore();
        if (updates.length > 0) {
          updateComponentsPhysics(updates);
        }
        lastSyncTimeRef.current = now;
      }
    },
    [components, wires, simulationResult, updateComponentsPhysics]
  );

  // 6. Управление перетаскиванием деталей в 3D пространстве
  const dragMove = useCallback((id: string, x3d: number, z3d: number) => {
    const physics = physicsEngineRef.current;
    if (!physics) return;
    const body = physics.getBody(id);
    if (body) {
      body.x = Math.max(-5.5, Math.min(5.5, x3d));
      body.z = Math.max(-3.5, Math.min(3.5, z3d));
      body.y = body.halfHeight;
      body.vx = 0;
      body.vy = 0;
      body.vz = 0;
    }
  }, []);

  const dragRelease = useCallback((id: string) => {
    const physics = physicsEngineRef.current;
    if (!physics) return;
    const body = physics.getBody(id);
    if (body) {
      body.isPinned = false;
    }
  }, []);

  // 7. Сброс к координатам 2D стола
  const resetTo2D = useCallback(() => {
    const physics = physicsEngineRef.current;
    if (physics) {
      physics.resetTo2DPositions(components);
    }
  }, [components]);

  // 8. Кинетический импульс встряхивания стола
  const shake = useCallback((magnitude: number = 3.2) => {
    const physics = physicsEngineRef.current;
    if (physics) {
      physics.shake(magnitude);
    }
  }, []);

  // 9. Переключение рубильника
  const toggleComponentSwitch = useCallback(
    (id: string) => {
      toggleSwitch(id);
    },
    [toggleSwitch]
  );

  // 10. Выбор компонента
  const selectComp = useCallback(
    (id: string | null) => {
      selectComponent(id);
    },
    [selectComponent]
  );

  return {
    syncedComponents,
    physicsEngine: physicsEngineRef.current,
    compHandles: compHandlesRef.current,
    wireSystem: wireSystemRef.current,
    stepPhysics,
    dragMove,
    dragRelease,
    resetTo2D,
    shake,
    toggleComponentSwitch,
    selectComp,
    circuitStatus: {
      isClosed: simulationResult?.isClosedCircuit ?? false,
      hasHazard: simulationResult?.hasShortCircuit ?? false,
      totalCurrent: simulationResult?.totalCurrent ?? 0,
      totalResistance: simulationResult?.totalEquivalentResistance ?? 0,
    },
  };
}
