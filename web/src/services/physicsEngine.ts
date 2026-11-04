/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Физический движок монтажного стола (Matter.js Physics Service)
 * Обеспечивает физическое моделирование твердых тел, столкновения, силу тяжести и упругие связи проводов.
 */

import Matter from 'matter-js';
import {CircuitComponent, Wire} from '../../../shared/types.ts';

const {Engine, World, Bodies, Body, Composite, Constraint, Vector} = Matter;

export const COMPONENT_PHYSICS_WIDTH = 164;
export const COMPONENT_PHYSICS_HEIGHT = 96;

export interface PhysicsServiceConfig {
  width: number;
  height: number;
  gravityX?: number;
  gravityY?: number;
  restitution?: number; // Коэффициент упругости отскока (0..1)
  friction?: number; // Трение о поверхности
  frictionAir?: number; // Трение о воздух/вязкость среды
  enableWireTethers?: boolean; // Физические связи проводов
}

export interface BodyTransform {
  id: string;
  x: number; // Верхний левый угол для SVG (x = body.position.x - width/2)
  y: number; // Верхний левый угол для SVG (y = body.position.y - height/2)
  rotation: number; // Угол в градусах (0..360)
  vx: number;
  vy: number;
  angularVelocity: number;
}

export class WorkbenchPhysicsService {
  private engine: Matter.Engine;
  private world: Matter.World;
  private width: number;
  private height: number;
  private bodiesMap: Map<string, Matter.Body> = new Map();
  private constraintsMap: Map<string, Matter.Constraint> = new Map();
  private boundaryBodies: Matter.Body[] = [];
  private isEnabled: boolean = false;
  private isGravityEnabled: boolean = false;
  private restitution: number = 0.35;
  private friction: number = 0.15;
  private frictionAir: number = 0.05;
  private enableWireTethers: boolean = true;

  constructor(config: PhysicsServiceConfig) {
    this.width = Math.max(300, config.width);
    this.height = Math.max(300, config.height);
    this.restitution = config.restitution ?? 0.35;
    this.friction = config.friction ?? 0.15;
    this.frictionAir = config.frictionAir ?? 0.05;
    this.enableWireTethers = config.enableWireTethers ?? true;

    this.engine = Engine.create({
      gravity: {
        x: config.gravityX ?? 0,
        y: config.gravityY ?? 0,
        scale: 0.001,
      },
    });
    this.world = this.engine.world;

    this.createBoundaries();
  }

  /**
   * Создает физические стены по периметру монтажного холста
   */
  private createBoundaries(): void {
    // Удаляем старые стены, если были
    if (this.boundaryBodies.length > 0) {
      Composite.remove(this.world, this.boundaryBodies);
      this.boundaryBodies = [];
    }

    const wallThickness = 60;
    const w = this.width;
    const h = this.height;

    // Пол, потолок, левая и правая стены
    const floor = Bodies.rectangle(w / 2, h + wallThickness / 2 - 2, w * 2, wallThickness, {
      isStatic: true,
      label: 'boundary-floor',
      restitution: this.restitution,
    });
    const ceiling = Bodies.rectangle(w / 2, -wallThickness / 2 + 2, w * 2, wallThickness, {
      isStatic: true,
      label: 'boundary-ceiling',
      restitution: this.restitution,
    });
    const leftWall = Bodies.rectangle(-wallThickness / 2 + 2, h / 2, wallThickness, h * 2, {
      isStatic: true,
      label: 'boundary-left',
      restitution: this.restitution,
    });
    const rightWall = Bodies.rectangle(w + wallThickness / 2 - 2, h / 2, wallThickness, h * 2, {
      isStatic: true,
      label: 'boundary-right',
      restitution: this.restitution,
    });

    this.boundaryBodies = [floor, ceiling, leftWall, rightWall];
    Composite.add(this.world, this.boundaryBodies);
  }

  /**
   * Обновляет границы при изменении размеров окна
   */
  public updateDimensions(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    this.createBoundaries();
  }

  /**
   * Синхронизирует компоненты холста с физическими телами Matter.js
   */
  public syncComponents(components: CircuitComponent[], draggingId: string | null = null): void {
    const currentIds = new Set(components.map((c) => c.id));

    // 1. Удаляем тела компонентов, которых больше нет
    for (const [id, body] of this.bodiesMap.entries()) {
      if (!currentIds.has(id)) {
        Composite.remove(this.world, body);
        this.bodiesMap.delete(id);
      }
    }

    // 2. Создаем или обновляем тела для каждого компонента
    for (const comp of components) {
      const centerX = comp.x + COMPONENT_PHYSICS_WIDTH / 2;
      const centerY = comp.y + COMPONENT_PHYSICS_HEIGHT / 2;
      const angleRad = ((comp.rotation || 0) * Math.PI) / 180;

      let body = this.bodiesMap.get(comp.id);

      if (!body) {
        body = Bodies.rectangle(
          centerX,
          centerY,
          COMPONENT_PHYSICS_WIDTH,
          COMPONENT_PHYSICS_HEIGHT,
          {
            restitution: this.restitution,
            friction: this.friction,
            frictionAir: this.frictionAir,
            density: 0.002,
            angle: angleRad,
            label: `component-${comp.type}-${comp.id}`,
          }
        );
        this.bodiesMap.set(comp.id, body);
        Composite.add(this.world, body);
      } else if (comp.id === draggingId) {
        // Если объект перетаскивается пользователем вручную, фиксируем его в точке курсора
        Body.setPosition(body, {x: centerX, y: centerY});
        Body.setVelocity(body, {x: 0, y: 0});
        Body.setAngularVelocity(body, 0);
      }
    }
  }

  /**
   * Синхронизирует соединительные провода как физические упругие связи (Matter.Constraint)
   */
  public syncWires(wires: Wire[]): void {
    if (!this.enableWireTethers) {
      this.clearConstraints();
      return;
    }

    const currentWireIds = new Set(wires.map((w) => w.id));

    // Удаляем старые связи
    for (const [wireId, constraint] of this.constraintsMap.entries()) {
      if (!currentWireIds.has(wireId)) {
        Composite.remove(this.world, constraint);
        this.constraintsMap.delete(wireId);
      }
    }

    // Создаем или обновляем упругие связи
    for (const wire of wires) {
      const bodyA = this.bodiesMap.get(wire.from.componentId);
      const bodyB = this.bodiesMap.get(wire.to.componentId);

      if (!bodyA || !bodyB || bodyA === bodyB) continue;

      if (!this.constraintsMap.has(wire.id)) {
        const dist = Vector.magnitude(Vector.sub(bodyA.position, bodyB.position));
        const constraint = Constraint.create({
          bodyA,
          bodyB,
          stiffness: 0.08, // Мягкая упругая натяжка как у реального провода
          damping: 0.1,
          length: Math.max(120, dist * 0.9),
          label: `wire-${wire.id}`,
        });

        this.constraintsMap.set(wire.id, constraint);
        Composite.add(this.world, constraint);
      }
    }
  }

  private clearConstraints(): void {
    for (const constraint of this.constraintsMap.values()) {
      Composite.remove(this.world, constraint);
    }
    this.constraintsMap.clear();
  }

  /**
   * Выполняет шаг физической симуляции (обычно 16.6мс при 60 FPS)
   */
  public step(deltaMs: number = 16.666): void {
    Engine.update(this.engine, deltaMs);
  }

  /**
   * Получает актуальные трансформации всех физических тел
   */
  public getAllTransforms(): BodyTransform[] {
    const transforms: BodyTransform[] = [];

    for (const [id, body] of this.bodiesMap.entries()) {
      // Переводим центр тела Matter.js в верхний левый угол SVG карточки
      const x = Math.round(body.position.x - COMPONENT_PHYSICS_WIDTH / 2);
      const y = Math.round(body.position.y - COMPONENT_PHYSICS_HEIGHT / 2);
      // Переводим радианы в градусы (0..360)
      const deg = Math.round((body.angle * 180) / Math.PI) % 360;
      const normalizedDeg = deg < 0 ? deg + 360 : deg;

      transforms.push({
        id,
        x,
        y,
        rotation: normalizedDeg,
        vx: body.velocity.x,
        vy: body.velocity.y,
        angularVelocity: body.angularVelocity,
      });
    }

    return transforms;
  }

  /**
   * Включение / выключение гравитации
   */
  public setGravity(enabled: boolean, gravityScale: number = 1): void {
    this.isGravityEnabled = enabled;
    this.engine.gravity.y = enabled ? gravityScale : 0;
  }

  public getGravityEnabled(): boolean {
    return this.isGravityEnabled;
  }

  /**
   * Применение импульса к объекту
   */
  public applyImpulse(compId: string, impulse: {x: number; y: number}): void {
    const body = this.bodiesMap.get(compId);
    if (!body) return;
    Body.applyForce(body, body.position, {
      x: impulse.x * 0.05,
      y: impulse.y * 0.05,
    });
  }

  /**
   * «Встряхнуть» монтажный стол (применяет случайные кинетические импульсы ко всем телам)
   */
  public shake(magnitude: number = 0.08): void {
    for (const body of this.bodiesMap.values()) {
      const angle = Math.random() * Math.PI * 2;
      const forceMag = (0.5 + Math.random() * 0.5) * magnitude;
      Body.applyForce(body, body.position, {
        x: Math.cos(angle) * forceMag,
        y: Math.sin(angle) * forceMag,
      });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
    }
  }

  /**
   * Настройка упругости отскока (restitution)
   */
  public setRestitution(value: number): void {
    this.restitution = Math.max(0, Math.min(1, value));
    for (const body of this.bodiesMap.values()) {
      body.restitution = this.restitution;
    }
  }

  public getRestitution(): number {
    return this.restitution;
  }

  /**
   * Включение/выключение связей проводов
   */
  public setWireTethers(enabled: boolean): void {
    this.enableWireTethers = enabled;
    if (!enabled) {
      this.clearConstraints();
    }
  }

  /**
   * Прямая установка координат при перетаскивании
   */
  public setComponentPosition(compId: string, x: number, y: number, angleDeg?: number): void {
    const body = this.bodiesMap.get(compId);
    if (!body) return;

    Body.setPosition(body, {
      x: x + COMPONENT_PHYSICS_WIDTH / 2,
      y: y + COMPONENT_PHYSICS_HEIGHT / 2,
    });
    Body.setVelocity(body, {x: 0, y: 0});

    if (angleDeg !== undefined) {
      Body.setAngle(body, (angleDeg * Math.PI) / 180);
      Body.setAngularVelocity(body, 0);
    }
  }

  /**
   * Очистка ресурсов физического мира
   */
  public destroy(): void {
    this.clearConstraints();
    Composite.clear(this.world, false);
    this.bodiesMap.clear();
    this.boundaryBodies = [];
  }
}
