/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — 3D Физический Движок Монтажного Стола (Workbench 3D Physics Engine)
 * Реализует симуляцию твердых тел (rigid bodies), гравитацию, столкновения со столом
 * и границами, упругие соударения компонентов, натяжение проводов (пружины Гука)
 * и двустороннюю синхронизацию с 2D схемой через useLabStore.
 */

import {CircuitComponent, Wire} from '../../../shared/types.ts';
import {map2DTo3D, map3DTo2D} from '../components/hero3d/workbench3d/Workbench3DScene.ts';

export interface RigidBody3D {
  id: string;
  type: string;
  x: number;
  y: number; // Высота над поверхностью стола (y = 0 — плоскость стола)
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotationY: number; // Рыскание (yaw) вокруг оси Y в радианах
  angularVy: number; // Угловая скорость rad/s
  mass: number;
  radius: number; // Радиус описанной окружности для соударений
  halfWidth: number;
  halfDepth: number;
  halfHeight: number;
  restitution: number; // Коэффициент восстановления при ударе (0..1)
  friction: number; // Трение о поверхность стола (0..1)
  isPinned: boolean; // Зафиксирован ли объект (например, при перетаскивании)
}

export interface Workbench3DPhysicsConfig {
  tableHalfWidth?: number; // Граница стола по X (по умолчанию 5.8)
  tableHalfDepth?: number; // Граница стола по Z (по умолчанию 3.8)
  gravityY?: number; // Ускорение свободного падения (по умолчанию -9.81)
  tableFriction?: number; // Трение о стол (по умолчанию 0.85)
  linearDamping?: number; // Сопротивление воздуха (по умолчанию 0.08)
  angularDamping?: number; // Затухание вращения (по умолчанию 0.15)
  defaultRestitution?: number; // Упругость по умолчанию (0.4)
  enableWireSprings?: boolean; // Упругие связи проводов между клеммами
  wireSpringK?: number; // Жесткость провода как пружины (Н/м)
  wireRestLength?: number; // Длина ненатянутого провода
}

export class Workbench3DPhysicsEngine {
  private bodies: Map<string, RigidBody3D> = new Map();
  private wires: Wire[] = [];
  private config: Required<Workbench3DPhysicsConfig>;
  private isGravityActive: boolean = true;
  private isSimulationActive: boolean = true;
  private wireSpringsActive: boolean = true;

  constructor(config: Workbench3DPhysicsConfig = {}) {
    this.config = {
      tableHalfWidth: config.tableHalfWidth ?? 5.8,
      tableHalfDepth: config.tableHalfDepth ?? 3.8,
      gravityY: config.gravityY ?? -9.81,
      tableFriction: config.tableFriction ?? 0.85,
      linearDamping: config.linearDamping ?? 0.08,
      angularDamping: config.angularDamping ?? 0.15,
      defaultRestitution: config.defaultRestitution ?? 0.4,
      enableWireSprings: config.enableWireSprings ?? true,
      wireSpringK: config.wireSpringK ?? 8.0,
      wireRestLength: config.wireRestLength ?? 2.8,
    };
    this.wireSpringsActive = this.config.enableWireSprings;
  }

  /**
   * Размеры и массы компонентов для реалистичной 3D механики
   */
  private getComponentDimensions(type: string): {
    mass: number;
    radius: number;
    halfWidth: number;
    halfDepth: number;
    halfHeight: number;
  } {
    switch (type) {
      case 'voltmeter':
      case 'ammeter':
        return {mass: 2.2, radius: 1.1, halfWidth: 0.95, halfDepth: 0.85, halfHeight: 0.65};
      case 'battery':
      case 'powersource_dc':
        return {mass: 3.5, radius: 1.2, halfWidth: 1.1, halfDepth: 0.9, halfHeight: 0.6};
      case 'rheostat':
      case 'potentiometer':
        return {mass: 1.8, radius: 1.2, halfWidth: 1.2, halfDepth: 0.5, halfHeight: 0.45};
      case 'switch':
        return {mass: 0.9, radius: 0.75, halfWidth: 0.7, halfDepth: 0.45, halfHeight: 0.35};
      case 'lamp':
        return {mass: 0.8, radius: 0.7, halfWidth: 0.65, halfDepth: 0.65, halfHeight: 0.55};
      case 'resistor':
      default:
        return {mass: 0.7, radius: 0.65, halfWidth: 0.6, halfDepth: 0.4, halfHeight: 0.3};
    }
  }

  /**
   * Синхронизация списка компонентов из 2D стола в 3D физические тела
   */
  public syncComponents(components: CircuitComponent[], pinnedCompId: string | null = null): void {
    const activeIds = new Set(components.map((c) => c.id));

    // Удаляем тела, которых больше нет в схеме
    for (const id of Array.from(this.bodies.keys())) {
      if (!activeIds.has(id)) {
        this.bodies.delete(id);
      }
    }

    // Добавляем или обновляем тела
    for (const comp of components) {
      const existing = this.bodies.get(comp.id);
      const isPinned = comp.id === pinnedCompId;

      if (!existing) {
        const dim = this.getComponentDimensions(comp.type);
        const {x: init3dX, z: init3dZ} = map2DTo3D(comp.x, comp.y);

        this.bodies.set(comp.id, {
          id: comp.id,
          type: comp.type,
          x: init3dX,
          y: dim.halfHeight, // Устанавливаем ровно на поверхность стола
          z: init3dZ,
          vx: 0,
          vy: 0,
          vz: 0,
          rotationY: ((comp.rotation || 0) * Math.PI) / 180,
          angularVy: 0,
          mass: dim.mass,
          radius: dim.radius,
          halfWidth: dim.halfWidth,
          halfDepth: dim.halfDepth,
          halfHeight: dim.halfHeight,
          restitution: this.config.defaultRestitution,
          friction: this.config.tableFriction,
          isPinned,
        });
      } else {
        existing.isPinned = isPinned;
        // Если объект удерживается пользователем или неподвижен, мягко актуализируем его 2D позицию
        if (isPinned) {
          const {x: tX, z: tZ} = map2DTo3D(comp.x, comp.y);
          existing.x = tX;
          existing.z = tZ;
          existing.vx = 0;
          existing.vy = 0;
          existing.vz = 0;
        }
      }
    }
  }

  /**
   * Синхронизация проводов схемы для расчета физики натяжения кабелей
   */
  public syncWires(wires: Wire[]): void {
    this.wires = wires;
  }

  /**
   * Принудительный сброс 3D координат точно к положению 2D схемы
   */
  public resetTo2DPositions(components: CircuitComponent[]): void {
    for (const comp of components) {
      const body = this.bodies.get(comp.id);
      const {x, z} = map2DTo3D(comp.x, comp.y);
      if (body) {
        body.x = x;
        body.y = body.halfHeight;
        body.z = z;
        body.vx = 0;
        body.vy = 0;
        body.vz = 0;
        body.rotationY = ((comp.rotation || 0) * Math.PI) / 180;
        body.angularVy = 0;
      }
    }
  }

  /**
   * Встряхивание монтажного стола (кинетический импульс во всех 3-х осях)
   */
  public shake(magnitude: number = 2.5): void {
    for (const body of this.bodies.values()) {
      if (body.isPinned) continue;
      body.vx += (Math.random() - 0.5) * magnitude * 2.0;
      body.vy += Math.random() * magnitude * 2.2 + 0.8; // Подбрасывание над столом
      body.vz += (Math.random() - 0.5) * magnitude * 2.0;
      body.angularVy += (Math.random() - 0.5) * magnitude * 1.5;
    }
  }

  /**
   * Применение направленного импульса к телу
   */
  public applyImpulse(compId: string, force: {x: number; y: number; z: number}): void {
    const body = this.bodies.get(compId);
    if (!body || body.isPinned) return;
    body.vx += force.x / body.mass;
    body.vy += force.y / body.mass;
    body.vz += force.z / body.mass;
  }

  /**
   * Один квант расчета 3D физики (Semi-implicit Euler Integrator)
   */
  public step(deltaTimeSec: number): void {
    if (!this.isSimulationActive || deltaTimeSec <= 0) return;

    // Ограничиваем dt для числовой стабильности (макс 33 мс)
    const dt = Math.min(deltaTimeSec, 0.033);
    const bodyList = Array.from(this.bodies.values());

    // 1. Применение сил (гравитация, натяжение проводов, затухание)
    for (const body of bodyList) {
      if (body.isPinned) continue;

      // Гравитация
      if (this.isGravityActive) {
        body.vy += this.config.gravityY * dt;
      }

      // Сопротивление среды
      body.vx *= Math.max(0, 1 - this.config.linearDamping * dt);
      body.vy *= Math.max(0, 1 - this.config.linearDamping * dt);
      body.vz *= Math.max(0, 1 - this.config.linearDamping * dt);
      body.angularVy *= Math.max(0, 1 - this.config.angularDamping * dt);
    }

    // 2. Расчет упругих сил натяжения соединительных проводов (Hooke's Law Springs)
    if (this.wireSpringsActive && this.wires.length > 0) {
      for (const wire of this.wires) {
        const bodyA = this.bodies.get(wire.from.componentId);
        const bodyB = this.bodies.get(wire.to.componentId);
        if (!bodyA || !bodyB) continue;

        const dx = bodyB.x - bodyA.x;
        const dz = bodyB.z - bodyA.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const restLen = this.config.wireRestLength;

        if (dist > restLen && dist > 0.001) {
          const stretch = dist - restLen;
          const forceMag = this.config.wireSpringK * stretch;
          const nx = dx / dist;
          const nz = dz / dist;

          // Демпфирование относительной скорости
          const relVx = bodyB.vx - bodyA.vx;
          const relVz = bodyB.vz - bodyA.vz;
          const dampingForce = (relVx * nx + relVz * nz) * 0.8;
          const totalForce = (forceMag + dampingForce);

          if (!bodyA.isPinned) {
            bodyA.vx += (totalForce / bodyA.mass) * nx * dt;
            bodyA.vz += (totalForce / bodyA.mass) * nz * dt;
          }
          if (!bodyB.isPinned) {
            bodyB.vx -= (totalForce / bodyB.mass) * nx * dt;
            bodyB.vz -= (totalForce / bodyB.mass) * nz * dt;
          }
        }
      }
    }

    // 3. Интегрирование скоростей в координаты
    for (const body of bodyList) {
      if (body.isPinned) continue;

      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.z += body.vz * dt;
      body.rotationY += body.angularVy * dt;
    }

    // 4. Столкновения с поверхностью стола (Y = 0)
    for (const body of bodyList) {
      if (body.isPinned) continue;

      if (body.y < body.halfHeight) {
        body.y = body.halfHeight;

        // Отскок от стола
        if (body.vy < 0) {
          body.vy = -body.vy * body.restitution;
          // Порог затухания для предотвращения микро-дребезга
          if (Math.abs(body.vy) < 0.12) {
            body.vy = 0;
          }
        }

        // Сухое трение скольжения о стол
        const frictionFactor = Math.max(0, 1 - body.friction * 4.5 * dt);
        body.vx *= frictionFactor;
        body.vz *= frictionFactor;
        body.angularVy *= frictionFactor;

        if (Math.abs(body.vx) < 0.01) body.vx = 0;
        if (Math.abs(body.vz) < 0.01) body.vz = 0;
        if (Math.abs(body.angularVy) < 0.01) body.angularVy = 0;
      }
    }

    // 5. Столкновения с защитными бортиками стола (X, Z границы)
    const maxX = this.config.tableHalfWidth;
    const maxZ = this.config.tableHalfDepth;

    for (const body of bodyList) {
      if (body.isPinned) continue;

      // Граница -X и +X
      if (body.x - body.halfWidth < -maxX) {
        body.x = -maxX + body.halfWidth;
        body.vx = Math.abs(body.vx) * body.restitution;
      } else if (body.x + body.halfWidth > maxX) {
        body.x = maxX - body.halfWidth;
        body.vx = -Math.abs(body.vx) * body.restitution;
      }

      // Граница -Z и +Z
      if (body.z - body.halfDepth < -maxZ) {
        body.z = -maxZ + body.halfDepth;
        body.vz = Math.abs(body.vz) * body.restitution;
      } else if (body.z + body.halfDepth > maxZ) {
        body.z = maxZ - body.halfDepth;
        body.vz = -Math.abs(body.vz) * body.restitution;
      }
    }

    // 6. Упругие соударения между парами 3D тел (Narrow-phase sphere impulse resolution)
    for (let i = 0; i < bodyList.length; i++) {
      const bA = bodyList[i];
      for (let j = i + 1; j < bodyList.length; j++) {
        const bB = bodyList[j];

        const dx = bB.x - bA.x;
        const dy = bB.y - bA.y;
        const dz = bB.z - bA.z;
        const distSq = dx * dx + dz * dz;
        const minDist = bA.radius + bB.radius;

        // Проверяем соприкосновение в плоскости XZ и перекрытие по высоте Y
        if (distSq < minDist * minDist && Math.abs(dy) < (bA.halfHeight + bB.halfHeight)) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = minDist - dist;
          const nx = dx / dist;
          const nz = dz / dist;

          // Расталкивание для устранения взаимопроникновения
          if (bA.isPinned && !bB.isPinned) {
            bB.x += nx * overlap;
            bB.z += nz * overlap;
          } else if (!bA.isPinned && bB.isPinned) {
            bA.x -= nx * overlap;
            bA.z -= nz * overlap;
          } else if (!bA.isPinned && !bB.isPinned) {
            bA.x -= nx * overlap * 0.5;
            bA.z -= nz * overlap * 0.5;
            bB.x += nx * overlap * 0.5;
            bB.z += nz * overlap * 0.5;
          }

          // Импульс упругого отскока
          const relVx = bB.vx - bA.vx;
          const relVz = bB.vz - bA.vz;
          const velAlongNormal = relVx * nx + relVz * nz;

          // Тела сближаются
          if (velAlongNormal < 0) {
            const restitution = Math.min(bA.restitution, bB.restitution);
            const impulse = -(1 + restitution) * velAlongNormal / (1 / bA.mass + 1 / bB.mass);

            if (!bA.isPinned) {
              bA.vx -= (impulse / bA.mass) * nx;
              bA.vz -= (impulse / bA.mass) * nz;
              bA.angularVy += (Math.random() - 0.5) * impulse * 0.2;
            }
            if (!bB.isPinned) {
              bB.vx += (impulse / bB.mass) * nx;
              bB.vz += (impulse / bB.mass) * nz;
              bB.angularVy -= (Math.random() - 0.5) * impulse * 0.2;
            }
          }
        }
      }
    }
  }

  /**
   * Возвращает снимок всех физических тел
   */
  public getTransforms(): Array<{
    id: string;
    x: number;
    y: number;
    z: number;
    rotationY: number;
    vx: number;
    vy: number;
    vz: number;
  }> {
    return Array.from(this.bodies.values()).map((b) => ({
      id: b.id,
      x: b.x,
      y: b.y,
      z: b.z,
      rotationY: b.rotationY,
      vx: b.vx,
      vy: b.vy,
      vz: b.vz,
    }));
  }

  /**
   * Преобразование координат 3D тел в 2D координаты для синхронизации с useLabStore
   */
  public getUpdatesFor2DStore(): Array<{id: string; x: number; y: number; rotation: number}> {
    const updates: Array<{id: string; x: number; y: number; rotation: number}> = [];

    for (const body of this.bodies.values()) {
      // Игнорируем зафиксированные тела (они и так позиционируются)
      if (body.isPinned) continue;

      const {x: x2d, y: y2d} = map3DTo2D(body.x, body.z);
      // Угол поворота в градусах 0..360
      let rotDeg = Math.round((body.rotationY * 180) / Math.PI) % 360;
      if (rotDeg < 0) rotDeg += 360;

      updates.push({
        id: body.id,
        x: Math.max(40, Math.min(1160, x2d)),
        y: Math.max(40, Math.min(760, y2d)),
        rotation: rotDeg,
      });
    }

    return updates;
  }

  /**
   * Управление состоянием симулятора
   */
  public setSimulationActive(active: boolean): void {
    this.isSimulationActive = active;
  }

  public isSimulationRunning(): boolean {
    return this.isSimulationActive;
  }

  public setGravityActive(active: boolean): void {
    this.isGravityActive = active;
  }

  public isGravityEnabled(): boolean {
    return this.isGravityActive;
  }

  public setWireSpringsActive(active: boolean): void {
    this.wireSpringsActive = active;
  }

  public isWireSpringsEnabled(): boolean {
    return this.wireSpringsActive;
  }

  public setRestitution(value: number): void {
    this.config.defaultRestitution = Math.max(0, Math.min(1, value));
    for (const b of this.bodies.values()) {
      b.restitution = this.config.defaultRestitution;
    }
  }

  public getRestitution(): number {
    return this.config.defaultRestitution;
  }

  public getBody(id: string): RigidBody3D | undefined {
    return this.bodies.get(id);
  }

  public destroy(): void {
    this.bodies.clear();
    this.wires = [];
  }
}
