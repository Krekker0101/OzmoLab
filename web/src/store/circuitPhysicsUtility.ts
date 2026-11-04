/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Утилита расчёта физики электрических цепей
 * Вычисляет падения напряжения (U), сопротивления (R), токи (I), мощности (P)
 * и топологический статус подключенных компонентов на монтажном столе.
 */

import {CircuitComponent, Wire} from '../../../shared/types.ts';
import {MNACircuit, MNAElement, MNASolution} from '../../../shared/solver/types.ts';
import {solveCircuit} from '../../../shared/solver/mnaSolver.ts';

export interface ComponentTerminalPhysics {
  id: string;
  potential: number; // Electric potential in Volts
  connectedWiresCount: number;
}

export interface ConnectedComponentPhysics {
  componentId: string;
  type: string;
  voltageDrop: number; // Voltage across component terminals in Volts (U = |Va - Vb|)
  resistance: number; // Operating or nominal resistance in Ohms (R)
  current: number; // Current flowing through component in Amperes (I)
  power: number; // Electrical power dissipated/supplied in Watts (P = U * I)
  isConnected: boolean; // Whether at least one wire is connected
  isFullyConnected: boolean; // Whether both active terminals are connected
  isConducting: boolean; // True when current > 1e-4 A
  status: 'normal' | 'active' | 'open' | 'overload' | 'blown';
  termA?: ComponentTerminalPhysics;
  termB?: ComponentTerminalPhysics;
}

export interface CircuitPhysicsOutput {
  totalVoltage: number; // Total electromotive force / source EMF (V)
  equivalentResistance: number; // Total circuit equivalent resistance (Ω)
  totalCurrent: number; // Total circuit current from sources (A)
  totalPower: number; // Total circuit power consumption (W)
  isClosedCircuit: boolean;
  hasShortCircuit: boolean;
  circuitStatus: 'open' | 'closed' | 'short_circuit' | 'empty';
  connectedComponentsCount: number;
  activeConductingCount: number;
  ohmsLaw: {
    calculatedCurrent: number;
    formula: string;
    isConsistent: boolean;
  };
  components: Record<string, ConnectedComponentPhysics>;
  nodeVoltages: Record<string, number>;
  warnings: Array<{
    code: string;
    message: string;
    elementId?: string;
  }>;
}

/**
 * Извлекает стандартные идентификаторы терминалов компонента
 */
export function getComponentTerminalIds(comp: CircuitComponent): {nodeAId: string; nodeBId: string} {
  if (comp.type === 'battery') {
    return {nodeAId: 'pos', nodeBId: 'neg'};
  }
  return {nodeAId: 'term_a', nodeBId: 'term_b'};
}

/**
 * Получает номинальное или установленное пользователем сопротивление компонента
 */
export function getComponentNominalResistance(comp: CircuitComponent): number {
  switch (comp.type) {
    case 'resistor':
      return Math.max(0.001, comp.values.resistance ?? 10);
    case 'lamp':
      return Math.max(0.1, comp.values.resistance ?? 15);
    case 'rheostat':
      return Math.max(0.1, comp.values.resistance ?? 25);
    case 'ammeter':
      return Math.max(0.0001, comp.values.internalResistance ?? 0.01);
    case 'voltmeter':
    case 'multimeter':
      return Math.max(1000, comp.values.internalResistance ?? 100000);
    case 'switch':
      return comp.state?.isOpen ? 1e9 : 1e-4;
    case 'battery':
      return Math.max(0.01, comp.values.internalResistance ?? 0.2);
    case 'capacitor':
      return 0.5; // Эквивалентное последовательное сопротивление (ESR)
    case 'diode':
      return 0.7; // Прямое сопротивление p-n перехода
    default:
      return 1e-4;
  }
}

/**
 * Форматирует значение напряжения для красивого вывода в UI
 */
export function formatVoltage(volts: number): string {
  if (Math.abs(volts) < 0.001) return '0.00 V';
  if (Math.abs(volts) >= 1000) return `${(volts / 1000).toFixed(2)} kV`;
  if (Math.abs(volts) < 0.1) return `${(volts * 1000).toFixed(1)} mV`;
  return `${volts.toFixed(2)} V`;
}

/**
 * Форматирует значение сопротивления для красивого вывода в UI
 */
export function formatResistance(ohms: number): string {
  if (ohms >= 1e6) return `${(ohms / 1e6).toFixed(2)} MΩ`;
  if (ohms >= 1000) return `${(ohms / 1000).toFixed(2)} kΩ`;
  if (ohms < 0.1 && ohms > 0) return `${(ohms * 1000).toFixed(1)} mΩ`;
  return `${ohms.toFixed(2)} Ω`;
}

/**
 * Форматирует значение силы тока для красивого вывода в UI
 */
export function formatCurrent(amperes: number): string {
  if (Math.abs(amperes) < 1e-5) return '0.00 A';
  if (Math.abs(amperes) < 0.001) return `${(amperes * 1e6).toFixed(1)} µA`;
  if (Math.abs(amperes) < 0.1) return `${(amperes * 1000).toFixed(1)} mA`;
  return `${amperes.toFixed(3)} A`;
}

/**
 * Форматирует значение мощности для красивого вывода в UI
 */
export function formatPower(watts: number): string {
  if (Math.abs(watts) < 0.001) return '0.00 W';
  if (Math.abs(watts) >= 1000) return `${(watts / 1000).toFixed(2)} kW`;
  if (Math.abs(watts) < 0.1) return `${(watts * 1000).toFixed(1)} mW`;
  return `${watts.toFixed(2)} W`;
}

/**
 * Основная функция расчёта: преобразует схему монтажного стола в netlist MNA,
 * решает уравнения Кирхгофа / МНУ и формирует полную физическую модель
 * для всех подключенных и изолированных компонентов.
 */
export function calculateConnectedComponentPhysics(
  components: CircuitComponent[],
  wires: Wire[]
): CircuitPhysicsOutput {
  if (!components || components.length === 0) {
    return {
      totalVoltage: 0,
      equivalentResistance: 0,
      totalCurrent: 0,
      totalPower: 0,
      isClosedCircuit: false,
      hasShortCircuit: false,
      circuitStatus: 'empty',
      connectedComponentsCount: 0,
      activeConductingCount: 0,
      ohmsLaw: {
        calculatedCurrent: 0,
        formula: 'I = 0.00V / 0.00Ω = 0.00A',
        isConsistent: true,
      },
      components: {},
      nodeVoltages: {},
      warnings: [],
    };
  }

  // Подсчёт количества подключенных проводов к каждому терминалу
  const terminalWireCounts = new Map<string, number>();
  wires.forEach((w) => {
    const fromKey = `${w.from.componentId}:${w.from.terminalId}`;
    const toKey = `${w.to.componentId}:${w.to.terminalId}`;
    terminalWireCounts.set(fromKey, (terminalWireCounts.get(fromKey) || 0) + 1);
    terminalWireCounts.set(toKey, (terminalWireCounts.get(toKey) || 0) + 1);
  });

  // Преобразуем компоненты и провода в элементы MNA
  const mnaElements: MNAElement[] = [];
  const batteries = components.filter((c) => c.type === 'battery');
  let totalSourceVoltage = 0;

  components.forEach((c) => {
    const {nodeAId, nodeBId} = getComponentTerminalIds(c);
    const fullNodeA = `${c.id}:${nodeAId}`;
    const fullNodeB = `${c.id}:${nodeBId}`;

    if (c.type === 'battery') {
      const emf = c.values.voltage ?? 9;
      totalSourceVoltage += emf;
      mnaElements.push({
        id: c.id,
        type: 'battery',
        nodeA: fullNodeA, // pos
        nodeB: fullNodeB, // neg
        value: emf,
        internalResistance: c.values.internalResistance ?? 0.2,
      });
    } else if (c.type === 'resistor') {
      mnaElements.push({
        id: c.id,
        type: 'resistor',
        nodeA: fullNodeA,
        nodeB: fullNodeB,
        value: Math.max(0.001, c.values.resistance ?? 10),
      });
    } else if (c.type === 'rheostat') {
      mnaElements.push({
        id: c.id,
        type: 'resistor',
        nodeA: fullNodeA,
        nodeB: fullNodeB,
        value: Math.max(0.1, c.values.resistance ?? 25),
      });
    } else if (c.type === 'lamp') {
      mnaElements.push({
        id: c.id,
        type: 'lamp',
        nodeA: fullNodeA,
        nodeB: fullNodeB,
        value: Math.max(0.1, c.values.resistance ?? 15),
        maxPower: 15.0,
        ratedCurrent: 0.6,
      });
    } else if (c.type === 'switch') {
      mnaElements.push({
        id: c.id,
        type: 'switch',
        nodeA: fullNodeA,
        nodeB: fullNodeB,
        isOpen: Boolean(c.state?.isOpen),
      });
    } else if (c.type === 'ammeter') {
      mnaElements.push({
        id: c.id,
        type: 'ammeter',
        nodeA: fullNodeA,
        nodeB: fullNodeB,
        internalResistance: c.values.internalResistance ?? 0.01,
      });
    } else if (c.type === 'voltmeter') {
      mnaElements.push({
        id: c.id,
        type: 'voltmeter',
        nodeA: fullNodeA,
        nodeB: fullNodeB,
        internalResistance: c.values.internalResistance ?? 100000,
      });
    } else if (c.type === 'multimeter') {
      mnaElements.push({
        id: c.id,
        type: 'voltmeter',
        nodeA: fullNodeA,
        nodeB: fullNodeB,
        internalResistance: 100000,
      });
    } else if (c.type === 'capacitor') {
      mnaElements.push({
        id: c.id,
        type: 'resistor',
        nodeA: fullNodeA,
        nodeB: fullNodeB,
        value: 0.5, // ESR
      });
    } else if (c.type === 'diode') {
      mnaElements.push({
        id: c.id,
        type: 'resistor',
        nodeA: fullNodeA,
        nodeB: fullNodeB,
        value: 0.7,
      });
    }
  });

  // Добавляем соединительные провода монтажного стола как проводящие элементы с нулевым сопротивлением
  wires.forEach((wire) => {
    mnaElements.push({
      id: wire.id,
      type: 'wire',
      nodeA: `${wire.from.componentId}:${wire.from.terminalId}`,
      nodeB: `${wire.to.componentId}:${wire.to.terminalId}`,
    });
  });

  // Выбираем опорную землю (отрицательный терминал первого источника питания)
  const groundNode = batteries.length > 0 ? `${batteries[0].id}:neg` : undefined;

  const mnaCircuit: MNACircuit = {
    elements: mnaElements,
    groundNode,
  };

  const solution: MNASolution = solveCircuit(mnaCircuit);

  // Формируем детальное физическое описание для каждого компонента
  const componentPhysicsMap: Record<string, ConnectedComponentPhysics> = {};
  let connectedCount = 0;
  let activeConductingCount = 0;

  components.forEach((c) => {
    const {nodeAId, nodeBId} = getComponentTerminalIds(c);
    const fullNodeA = `${c.id}:${nodeAId}`;
    const fullNodeB = `${c.id}:${nodeBId}`;

    const wiresOnA = terminalWireCounts.get(fullNodeA) || 0;
    const wiresOnB = terminalWireCounts.get(fullNodeB) || 0;
    const isConnected = wiresOnA > 0 || wiresOnB > 0;
    const isFullyConnected = wiresOnA > 0 && wiresOnB > 0;

    if (isConnected) connectedCount++;

    const potentialA = solution.nodeVoltages[fullNodeA] ?? 0;
    const potentialB = solution.nodeVoltages[fullNodeB] ?? 0;

    const elemRes = solution.elementResults[c.id];
    let voltageDrop = elemRes ? Math.abs(elemRes.voltageDrop) : Math.abs(potentialA - potentialB);
    let current = elemRes ? Math.abs(elemRes.current) : 0;
    let resistance = getComponentNominalResistance(c);

    // Если компонент проводит ток, реальное рабочее сопротивление R = U / I
    if (c.type !== 'battery' && current > 1e-4) {
      resistance = Number((voltageDrop / current).toFixed(2));
    }

    if (c.type === 'battery') {
      voltageDrop = c.values.voltage ?? 9;
      // Ток батареи равен току, который отдаёт источник
      if (elemRes) {
        current = Math.abs(elemRes.current);
      }
    }

    const isConducting = isConnected && current > 1e-4;
    if (isConducting) activeConductingCount++;

    const power = Number((voltageDrop * current).toFixed(3));

    let compStatus: ConnectedComponentPhysics['status'] = 'normal';
    if (c.state?.isBlown) {
      compStatus = 'blown';
    } else if (elemRes?.status === 'overload' || solution.hasShortCircuit) {
      compStatus = 'overload';
    } else if (isConducting) {
      compStatus = 'active';
    } else if (!isFullyConnected || (c.type === 'switch' && c.state?.isOpen)) {
      compStatus = 'open';
    }

    componentPhysicsMap[c.id] = {
      componentId: c.id,
      type: c.type,
      voltageDrop: Number(voltageDrop.toFixed(3)),
      resistance: Number(resistance.toFixed(2)),
      current: Number(current.toFixed(4)),
      power,
      isConnected,
      isFullyConnected,
      isConducting,
      status: compStatus,
      termA: {
        id: nodeAId,
        potential: Number(potentialA.toFixed(3)),
        connectedWiresCount: wiresOnA,
      },
      termB: {
        id: nodeBId,
        potential: Number(potentialB.toFixed(3)),
        connectedWiresCount: wiresOnB,
      },
    };
  });

  const totalCurrent = solution.totalCurrent;
  let equivalentResistance = solution.totalEquivalentResistance;

  // Если цепь замкнута, но эквивалентное сопротивление равно 0, вычисляем по закону Ома
  if (solution.isClosedCircuit && totalCurrent > 1e-4 && totalSourceVoltage > 0) {
    equivalentResistance = Number((totalSourceVoltage / totalCurrent).toFixed(2));
  } else if (!solution.isClosedCircuit) {
    // В разомкнутой цепи эквивалентное сопротивление разомкнуто (номинальная сумма подключенных элементов)
    let connectedSum = 0;
    components.forEach((c) => {
      if (c.type !== 'battery' && (terminalWireCounts.get(`${c.id}:term_a`) || 0) > 0) {
        connectedSum += getComponentNominalResistance(c);
      }
    });
    equivalentResistance = connectedSum > 0 ? connectedSum : 0;
  }

  const totalPower = Number((totalSourceVoltage * totalCurrent).toFixed(3));

  let circuitStatus: CircuitPhysicsOutput['circuitStatus'] = 'open';
  if (solution.hasShortCircuit) {
    circuitStatus = 'short_circuit';
  } else if (solution.isClosedCircuit) {
    circuitStatus = 'closed';
  } else if (components.length === 0) {
    circuitStatus = 'empty';
  }

  // Проверка закона Ома для полной цепи: I = U / R_eq
  const calculatedCurrent =
    equivalentResistance > 0 ? Number((totalSourceVoltage / equivalentResistance).toFixed(4)) : 0;
  const isOhmConsistent =
    !solution.isClosedCircuit ||
    Math.abs(totalCurrent - calculatedCurrent) < 0.05 ||
    solution.hasShortCircuit;

  const formulaString = `I = ${totalSourceVoltage.toFixed(2)}V / ${equivalentResistance.toFixed(2)}Ω = ${totalCurrent.toFixed(3)}A`;

  return {
    totalVoltage: Number(totalSourceVoltage.toFixed(2)),
    equivalentResistance: Number(equivalentResistance.toFixed(2)),
    totalCurrent: Number(totalCurrent.toFixed(4)),
    totalPower,
    isClosedCircuit: solution.isClosedCircuit,
    hasShortCircuit: solution.hasShortCircuit,
    circuitStatus,
    connectedComponentsCount: connectedCount,
    activeConductingCount,
    ohmsLaw: {
      calculatedCurrent,
      formula: formulaString,
      isConsistent: isOhmConsistent,
    },
    components: componentPhysicsMap,
    nodeVoltages: solution.nodeVoltages,
    warnings: solution.warnings.map((w) => ({
      code: w.code,
      message: w.message,
      elementId: w.elementId,
    })),
  };
}
