/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Плагин лаборатории «Цепи постоянного тока»
 * Реализует контракт LabModule.
 */

import {
  AISummarySnapshot,
  CircuitComponent,
  ComponentDefinition,
  LabModule,
  LabState,
  Lesson,
  SimulationResult,
} from '../../../../shared/types.ts';

export const circuitComponentsList: ComponentDefinition[] = [
  {
    type: 'battery',
    nameKey: 'component.battery',
    category: 'sources',
    iconName: 'BatteryCharging',
    terminals: [
      {id: 'neg', nameKey: 'terminal.neg', relativeX: 15, relativeY: 50},
      {id: 'pos', nameKey: 'terminal.pos', relativeX: 85, relativeY: 50},
    ],
    properties: [
      {
        key: 'voltage',
        nameKey: 'property.voltage',
        unit: 'V',
        defaultValue: 9,
        min: 1.5,
        max: 24,
        step: 0.5,
      },
      {
        key: 'internalResistance',
        nameKey: 'property.resistance',
        unit: 'Ω',
        defaultValue: 0.2,
        min: 0.05,
        max: 2,
        step: 0.05,
      },
    ],
    descriptionKey: 'glossary.battery.desc',
  },
  {
    type: 'resistor',
    nameKey: 'component.resistor',
    category: 'loads',
    iconName: 'Activity',
    terminals: [
      {id: 'term_a', nameKey: 'terminal.a', relativeX: 15, relativeY: 50},
      {id: 'term_b', nameKey: 'terminal.b', relativeX: 85, relativeY: 50},
    ],
    properties: [
      {
        key: 'resistance',
        nameKey: 'property.resistance',
        unit: 'Ω',
        defaultValue: 10,
        min: 1,
        max: 1000,
        step: 1,
      },
    ],
    descriptionKey: 'glossary.resistor.desc',
  },
  {
    type: 'lamp',
    nameKey: 'component.lamp',
    category: 'loads',
    iconName: 'Lightbulb',
    terminals: [
      {id: 'term_a', nameKey: 'terminal.a', relativeX: 15, relativeY: 50},
      {id: 'term_b', nameKey: 'terminal.b', relativeX: 85, relativeY: 50},
    ],
    properties: [
      {
        key: 'resistance',
        nameKey: 'property.resistance',
        unit: 'Ω',
        defaultValue: 15,
        min: 2,
        max: 100,
        step: 1,
      },
    ],
    descriptionKey: 'glossary.lamp.desc',
  },
  {
    type: 'switch',
    nameKey: 'component.switch',
    category: 'switches',
    iconName: 'ToggleRight',
    terminals: [
      {id: 'term_a', nameKey: 'terminal.a', relativeX: 15, relativeY: 50},
      {id: 'term_b', nameKey: 'terminal.b', relativeX: 85, relativeY: 50},
    ],
    properties: [],
    descriptionKey: 'glossary.switch.desc',
  },
  {
    type: 'ammeter',
    nameKey: 'component.ammeter',
    category: 'meters',
    iconName: 'Gauge',
    terminals: [
      {id: 'term_a', nameKey: 'terminal.a', relativeX: 15, relativeY: 50},
      {id: 'term_b', nameKey: 'terminal.b', relativeX: 85, relativeY: 50},
    ],
    properties: [
      {
        key: 'internalResistance',
        nameKey: 'property.resistance',
        unit: 'Ω',
        defaultValue: 0.01,
        min: 0.001,
        max: 0.1,
        step: 0.005,
      },
    ],
    descriptionKey: 'glossary.ammeter.desc',
  },
  {
    type: 'voltmeter',
    nameKey: 'component.voltmeter',
    category: 'meters',
    iconName: 'Zap',
    terminals: [
      {id: 'term_a', nameKey: 'terminal.a', relativeX: 15, relativeY: 50},
      {id: 'term_b', nameKey: 'terminal.b', relativeX: 85, relativeY: 50},
    ],
    properties: [
      {
        key: 'internalResistance',
        nameKey: 'property.resistance',
        unit: 'Ω',
        defaultValue: 100000,
        min: 10000,
        max: 1000000,
        step: 10000,
      },
    ],
    descriptionKey: 'glossary.voltmeter.desc',
  },
  {
    type: 'rheostat',
    nameKey: 'component.rheostat',
    category: 'loads',
    iconName: 'Sliders',
    terminals: [
      {id: 'term_a', nameKey: 'terminal.a', relativeX: 15, relativeY: 50},
      {id: 'term_b', nameKey: 'terminal.b', relativeX: 85, relativeY: 50},
    ],
    properties: [
      {
        key: 'resistance',
        nameKey: 'property.resistance',
        unit: 'Ω',
        defaultValue: 25,
        min: 1,
        max: 100,
        step: 1,
      },
    ],
    descriptionKey: 'glossary.resistor.desc',
  },
  {
    type: 'capacitor',
    nameKey: 'component.capacitor',
    category: 'loads',
    iconName: 'Pause',
    terminals: [
      {id: 'term_a', nameKey: 'terminal.a', relativeX: 15, relativeY: 50},
      {id: 'term_b', nameKey: 'terminal.b', relativeX: 85, relativeY: 50},
    ],
    properties: [
      {
        key: 'capacitance',
        nameKey: 'property.capacitance',
        unit: 'µF',
        defaultValue: 100,
        min: 10,
        max: 1000,
        step: 10,
      },
    ],
    descriptionKey: 'glossary.resistor.desc',
  },
  {
    type: 'diode',
    nameKey: 'component.diode',
    category: 'loads',
    iconName: 'Play',
    terminals: [
      {id: 'term_a', nameKey: 'terminal.a', relativeX: 15, relativeY: 50},
      {id: 'term_b', nameKey: 'terminal.b', relativeX: 85, relativeY: 50},
    ],
    properties: [
      {
        key: 'forwardVoltage',
        nameKey: 'property.voltage',
        unit: 'V',
        defaultValue: 0.7,
        min: 0.2,
        max: 1.5,
        step: 0.1,
      },
    ],
    descriptionKey: 'glossary.resistor.desc',
  },
  {
    type: 'multimeter',
    nameKey: 'component.multimeter',
    category: 'meters',
    iconName: 'Activity',
    terminals: [
      {id: 'term_a', nameKey: 'terminal.a', relativeX: 15, relativeY: 50},
      {id: 'term_b', nameKey: 'terminal.b', relativeX: 85, relativeY: 50},
    ],
    properties: [],
    descriptionKey: 'glossary.ammeter.desc',
  },
];

/**
 * Стартовые уроки для цепей постоянного тока
 */
export const circuitsLessons: Lesson[] = [
  {
    id: 'lesson-1-basic-circuit',
    titleKey: 'lesson.1.title',
    descriptionKey: 'lesson.1.desc',
    gradeLevel: 8,
    difficulty: 'easy',
    steps: [
      {
        id: 'step-1-add-power',
        stepNumber: 1,
        titleKey: 'lesson.1.step.1.title',
        instructionKey: 'lesson.1.step.1.instr',
        hintKey: 'lesson.1.step.1.hint',
        validate: (state: LabState) => {
          const hasBattery = state.components.some((c) => c.type === 'battery');
          const hasLamp = state.components.some((c) => c.type === 'lamp');
          return {
            passed: hasBattery && hasLamp,
            feedbackKey: hasBattery && hasLamp ? 'lesson.success' : 'lesson.failure',
          };
        },
      },
      {
        id: 'step-2-connect-loop',
        stepNumber: 2,
        titleKey: 'lesson.1.step.2.title',
        instructionKey: 'lesson.1.step.2.instr',
        hintKey: 'lesson.1.step.2.hint',
        validate: (state: LabState) => {
          const hasWires = state.wires.length >= 2;
          const isClosed = Boolean(state.simulationResult?.isClosedCircuit);
          return {
            passed: hasWires && isClosed,
            feedbackKey: hasWires && isClosed ? 'lesson.success' : 'lesson.failure',
          };
        },
      },
      {
        id: 'step-3-close-switch',
        stepNumber: 3,
        titleKey: 'lesson.1.step.3.title',
        instructionKey: 'lesson.1.step.3.instr',
        hintKey: 'lesson.1.step.3.hint',
        validate: (state: LabState) => {
          const lamp = state.components.find((c) => c.type === 'lamp');
          const isLit = Boolean(lamp?.state?.illuminated);
          return {
            passed: isLit,
            feedbackKey: isLit ? 'lesson.success' : 'lesson.failure',
          };
        },
      },
    ],
  },
  {
    id: 'lesson-2-ohms-law',
    titleKey: 'lesson.2.title',
    descriptionKey: 'lesson.2.desc',
    gradeLevel: 8,
    difficulty: 'medium',
    steps: [
      {
        id: 'step-1-ammeter-series',
        stepNumber: 1,
        titleKey: 'lesson.2.step.1.title',
        instructionKey: 'lesson.2.step.1.instr',
        hintKey: 'lesson.2.step.1.hint',
        validate: (state: LabState) => {
          const hasAmmeter = state.components.some((c) => c.type === 'ammeter');
          const hasCurrent = (state.simulationResult?.totalCurrent ?? 0) > 0;
          return {
            passed: hasAmmeter && hasCurrent,
            feedbackKey: hasAmmeter && hasCurrent ? 'lesson.success' : 'lesson.failure',
          };
        },
      },
    ],
  },
  {
    id: 'lesson-3-rheostat-measure',
    titleKey: 'lesson.2.title',
    descriptionKey: 'lesson.2.desc',
    gradeLevel: 8,
    difficulty: 'medium',
    steps: [
      {
        id: 'step-1-rheostat-connect',
        stepNumber: 1,
        titleKey: 'lesson.2.step.1.title',
        instructionKey: 'lesson.2.step.1.instr',
        hintKey: 'lesson.2.step.1.hint',
        validate: (state: LabState) => {
          const hasRheostat = state.components.some((c) => c.type === 'rheostat');
          const hasBattery = state.components.some((c) => c.type === 'battery');
          const isClosed = Boolean(state.simulationResult?.isClosedCircuit);
          return {
            passed: hasRheostat && hasBattery && isClosed,
            feedbackKey: hasRheostat && hasBattery && isClosed ? 'lesson.success' : 'lesson.failure',
          };
        },
      },
    ],
  },
];

/**
 * Физический расчёт состояния электрической цепи постоянного тока
 */
function simulateCircuitsDC(state: LabState): SimulationResult {
  const battery = state.components.find((c) => c.type === 'battery');
  if (!battery || state.wires.length === 0) {
    return {
      isClosedCircuit: false,
      hasShortCircuit: false,
      totalCurrent: 0,
      totalEquivalentResistance: 0,
      componentStates: {},
      warnings: [],
    };
  }

  // Создаём граф соединений между терминалами
  const adjacency = new Map<string, string[]>();
  const addEdge = (u: string, v: string) => {
    if (!adjacency.has(u)) adjacency.set(u, []);
    if (!adjacency.has(v)) adjacency.set(v, []);
    adjacency.get(u)!.push(v);
    adjacency.get(v)!.push(u);
  };

  // 1. Внутренние связи внутри компонентов
  const componentsById = new Map<string, CircuitComponent>();
  state.components.forEach((c) => {
    componentsById.set(c.id, c);
    if (c.type === 'switch') {
      // Ключ проводит ток только когда замкнут (!isOpen)
      if (!c.state.isOpen) {
        addEdge(`${c.id}:term_a`, `${c.id}:term_b`);
      }
    } else if (c.type === 'lamp') {
      // Перегоревшая лампа разрывает цепь
      if (!c.state.isBlown) {
        addEdge(`${c.id}:term_a`, `${c.id}:term_b`);
      }
    } else if (
      c.type === 'resistor' ||
      c.type === 'rheostat' ||
      c.type === 'ammeter' ||
      c.type === 'capacitor' ||
      c.type === 'multimeter'
    ) {
      addEdge(`${c.id}:term_a`, `${c.id}:term_b`);
    } else if (c.type === 'diode') {
      // Диод проводит от А к Б
      addEdge(`${c.id}:term_a`, `${c.id}:term_b`);
    }
  });

  // 2. Внешние провода
  state.wires.forEach((wire) => {
    const fromStr = `${wire.from.componentId}:${wire.from.terminalId}`;
    const toStr = `${wire.to.componentId}:${wire.to.terminalId}`;
    addEdge(fromStr, toStr);
  });

  // 3. Поиск пути от плюса батареи к минусу
  const startTerminal = `${battery.id}:pos`;
  const endTerminal = `${battery.id}:neg`;

  const visited = new Set<string>();
  const queue: string[][] = [[startTerminal]];
  let foundPath: string[] | null = null;

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === endTerminal && path.length > 2) {
      foundPath = path;
      break;
    }

    if (!visited.has(current)) {
      visited.add(current);
      const neighbors = adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        if (!path.includes(neighbor)) {
          queue.push([...path, neighbor]);
        }
      }
    }
  }

  const isClosed = foundPath !== null;
  let totalResistance = battery.values.internalResistance ?? 0.2;
  const involvedComponentIds = new Set<string>();

  if (isClosed && foundPath) {
    foundPath.forEach((termStr) => {
      const compId = termStr.split(':')[0];
      if (compId !== battery.id) {
        involvedComponentIds.add(compId);
      }
    });

    involvedComponentIds.forEach((compId) => {
      const comp = componentsById.get(compId);
      if (!comp) return;
      if (comp.type === 'resistor') {
        totalResistance += comp.values.resistance ?? 10;
      } else if (comp.type === 'rheostat') {
        totalResistance += comp.values.resistance ?? 25;
      } else if (comp.type === 'lamp') {
        totalResistance += comp.values.resistance ?? 15;
      } else if (comp.type === 'ammeter' || comp.type === 'multimeter') {
        totalResistance += comp.values.internalResistance ?? 0.01;
      } else if (comp.type === 'capacitor') {
        totalResistance += 0.5; // Эквивалентное последовательное сопротивление (ESR)
      } else if (comp.type === 'diode') {
        totalResistance += 0.7; // Динамическое сопротивление p-n перехода
      }
    });
  }

  const batteryVoltage = battery.values.voltage ?? 9;
  const hasShortCircuit = isClosed && totalResistance < 0.25;
  const totalCurrent = isClosed ? (hasShortCircuit ? 45.0 : batteryVoltage / totalResistance) : 0;

  const componentStates: SimulationResult['componentStates'] = {};
  const warnings: SimulationResult['warnings'] = [];

  if (hasShortCircuit) {
    warnings.push({
      code: 'SHORT_CIRCUIT',
      messageKey: 'warning.short_circuit',
    });
  } else if (!isClosed && state.wires.length > 0) {
    warnings.push({
      code: 'OPEN_CIRCUIT',
      messageKey: 'warning.open_circuit',
    });
  }

  state.components.forEach((comp) => {
    if (comp.id === battery.id) {
      componentStates[comp.id] = {
        current: totalCurrent,
        voltageDrop: batteryVoltage,
        power: batteryVoltage * totalCurrent,
        status: hasShortCircuit ? 'overload' : 'normal',
      };
      return;
    }

    const isInPath = involvedComponentIds.has(comp.id);
    const compCurrent = isInPath ? totalCurrent : 0;

    let compResistance = 0;
    if (comp.type === 'resistor' || comp.type === 'lamp') {
      compResistance = comp.values.resistance ?? (comp.type === 'lamp' ? 15 : 10);
    } else if (comp.type === 'rheostat') {
      compResistance = comp.values.resistance ?? 25;
    } else if (comp.type === 'ammeter' || comp.type === 'multimeter') {
      compResistance = comp.values.internalResistance ?? 0.01;
    } else if (comp.type === 'diode') {
      compResistance = 0.7;
    } else if (comp.type === 'capacitor') {
      compResistance = 0.5;
    }

    const voltageDrop = compCurrent * compResistance;
    const power = voltageDrop * compCurrent;

    // Проверка перегорания лампы при превышении мощности 15.0 Вт или тока 2.5 А
    if (comp.type === 'lamp') {
      if (power > 15.0 || compCurrent > 2.5) {
        comp.state.isBlown = true;
        comp.state.illuminated = false;
        comp.state.brightness = 0;
        warnings.push({
          code: 'VOLTAGE_OVERLOAD',
          messageKey: 'warning.short_circuit',
        });
      } else if (!comp.state.isBlown) {
        comp.state.illuminated = compCurrent > 0.05 && !hasShortCircuit;
        comp.state.brightness = Math.min(1, compCurrent / 0.6);
      }
    }

    // Обновление показаний амперметра и мультиметра
    if (comp.type === 'ammeter' || comp.type === 'multimeter') {
      comp.state.reading = Number(compCurrent.toFixed(3));
    }
    if (comp.type === 'voltmeter') {
      comp.state.reading = Number(voltageDrop.toFixed(2));
    }

    componentStates[comp.id] = {
      current: compCurrent,
      voltageDrop,
      power,
      status: compCurrent > 2.0 ? 'overload' : compCurrent > 0 ? 'active' : 'open',
    };
  });

  return {
    isClosedCircuit: isClosed,
    hasShortCircuit,
    totalCurrent: Number(totalCurrent.toFixed(3)),
    totalEquivalentResistance: Number(totalResistance.toFixed(2)),
    componentStates,
    warnings,
  };
}

/**
 * Проекция состояния цепи для ИИ-наставника
 */
function describeCircuitsState(state: LabState): AISummarySnapshot {
  const language = state.language ?? 'ru';
  const result = state.simulationResult;
  const activeComponentsCount = state.components.length;
  const connectionsCount = state.wires.length;

  const componentsDesc = state.components.map((c) => {
    const simState = result?.componentStates[c.id];
    const isEnglish = language === 'en';
    const isTajik = language === 'tg';
    let stateText = isEnglish ? 'inactive' : isTajik ? 'ғайрифаъол' : 'отключен';
    if (c.type === 'switch') {
      stateText = c.state.isOpen
        ? isEnglish ? 'open' : isTajik ? 'кушода' : 'разомкнут'
        : isEnglish ? 'closed' : isTajik ? 'пӯшида' : 'замкнут';
    } else if (c.type === 'lamp') {
      stateText = c.state.illuminated
        ? isEnglish
          ? `on (brightness ${Math.round((c.state.brightness || 0) * 100)}%)`
          : isTajik
            ? `фурӯзон (равшанӣ ${Math.round((c.state.brightness || 0) * 100)}%)`
            : `горит (яркость ${Math.round((c.state.brightness || 0) * 100)}%)`
        : isEnglish ? 'off' : isTajik ? 'хомӯш' : 'не горит';
    } else if (simState && simState.current > 0) {
      stateText = isEnglish ? `active, current: ${simState.current} A` : isTajik ? `фаъол, ҷараён: ${simState.current} A` : `активен, ток: ${simState.current}A`;
    }

    return {
      id: c.id,
      type: c.type,
      parameters: c.values,
      measuredCurrent: simState?.current,
      measuredVoltage: simState?.voltageDrop,
      stateText,
    };
  });

  const isClosed = result?.isClosedCircuit ?? false;
  const hasShort = result?.hasShortCircuit ?? false;

  const isEnglish = language === 'en';
  const isTajik = language === 'tg';
  let summaryText = isEnglish
    ? `The circuit contains ${activeComponentsCount} components and ${connectionsCount} wires.`
    : isTajik
      ? `Схема ${activeComponentsCount} унсур ва ${connectionsCount} сим дорад.`
      : `Схема содержит ${activeComponentsCount} компонентов и ${connectionsCount} проводов.`;
  if (hasShort) {
    summaryText += isEnglish ? ' WARNING: A short circuit was detected!' : isTajik ? ' ДИҚҚАТ: Расиши кӯтоҳ ошкор шуд!' : ' ВНИМАНИЕ: Зафиксировано короткое замыкание!';
  } else if (isClosed) {
    summaryText += isEnglish
      ? ` The circuit is closed; total current is ${result?.totalCurrent} A and equivalent resistance is ${result?.totalEquivalentResistance} Ω.`
      : isTajik
        ? ` Занҷир пӯшида аст; ҷараёни умумӣ ${result?.totalCurrent} A ва муқовимати эквивалентӣ ${result?.totalEquivalentResistance} Ω мебошад.`
        : ` Цепь замкнута, суммарный ток составляет ${result?.totalCurrent}A, эквивалентное сопротивление ${result?.totalEquivalentResistance}Ω.`;
  } else {
    summaryText += isEnglish ? ' The circuit is open (current is zero).' : isTajik ? ' Занҷир кушода аст (ҷараён ба сифр баробар аст).' : ' Цепь разомкнута (ток равен нулю).';
  }

  return {
    labId: 'circuits-dc',
    summaryText,
    isCircuitComplete: isClosed,
    hasHazard: hasShort,
    activeComponentsCount,
    components: componentsDesc,
    connectionsCount,
  };
}

export const CircuitsDCModule: LabModule = {
  id: 'circuits-dc',
  titleKey: 'labs.circuits_dc.title',
  descriptionKey: 'labs.circuits_dc.description',
  discipline: 'circuits',
  components: circuitComponentsList,
  simulate: simulateCircuitsDC,
  describeState: describeCircuitsState,
  lessons: circuitsLessons,
  defaultState: {
    components: [
      {
        id: 'bat_1',
        type: 'battery',
        x: 180,
        y: 220,
        rotation: 0,
        values: {voltage: 9, internalResistance: 0.2},
        state: {},
      },
      {
        id: 'sw_1',
        type: 'switch',
        x: 360,
        y: 120,
        rotation: 0,
        values: {},
        state: {isOpen: true},
      },
      {
        id: 'lamp_1',
        type: 'lamp',
        x: 540,
        y: 220,
        rotation: 0,
        values: {resistance: 15},
        state: {illuminated: false, brightness: 0},
      },
    ],
    wires: [
      {
        id: 'w_1',
        from: {componentId: 'bat_1', terminalId: 'pos'},
        to: {componentId: 'sw_1', terminalId: 'term_a'},
      },
      {
        id: 'w_2',
        from: {componentId: 'sw_1', terminalId: 'term_b'},
        to: {componentId: 'lamp_1', terminalId: 'term_a'},
      },
      {
        id: 'w_3',
        from: {componentId: 'lamp_1', terminalId: 'term_b'},
        to: {componentId: 'bat_1', terminalId: 'neg'},
      },
    ],
  },
};
