/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Плагин лаборатории «Геометрическая оптика»
 * Демонстрирует расширяемость модульной системы LabModule для смежных дисциплин.
 */

import {
  AISummarySnapshot,
  ComponentDefinition,
  LabModule,
  LabState,
  Lesson,
  SimulationResult,
} from '../../../../shared/types.ts';

export const opticsComponentsList: ComponentDefinition[] = [
  {
    type: 'laser_source',
    nameKey: 'component.laser_source',
    category: 'optics',
    iconName: 'Sun',
    terminals: [{id: 'beam_out', nameKey: 'terminal.beam_out', relativeX: 90, relativeY: 50}],
    properties: [
      {
        key: 'wavelength',
        nameKey: 'property.wavelength',
        unit: 'nm',
        defaultValue: 650,
        min: 400,
        max: 750,
        step: 10,
      },
    ],
    descriptionKey: 'glossary.laser.desc',
  },
  {
    type: 'convex_lens',
    nameKey: 'component.convex_lens',
    category: 'optics',
    iconName: 'Maximize2',
    terminals: [
      {id: 'surface_in', nameKey: 'terminal.surface_in', relativeX: 10, relativeY: 50},
      {id: 'surface_out', nameKey: 'terminal.surface_out', relativeX: 90, relativeY: 50},
    ],
    properties: [
      {
        key: 'focalLength',
        nameKey: 'property.focalLength',
        unit: 'cm',
        defaultValue: 15,
        min: 5,
        max: 50,
        step: 1,
      },
    ],
    descriptionKey: 'glossary.lens.desc',
  },
  {
    type: 'concave_lens',
    nameKey: 'component.concave_lens',
    category: 'optics',
    iconName: 'Minimize2',
    terminals: [
      {id: 'surface_in', nameKey: 'terminal.surface_in', relativeX: 10, relativeY: 50},
      {id: 'surface_out', nameKey: 'terminal.surface_out', relativeX: 90, relativeY: 50},
    ],
    properties: [
      {
        key: 'focalLength',
        nameKey: 'property.focalLength',
        unit: 'cm',
        defaultValue: 15,
        min: 5,
        max: 50,
        step: 1,
      },
    ],
    descriptionKey: 'glossary.lens.desc',
  },
  {
    type: 'optical_screen',
    nameKey: 'component.optical_screen',
    category: 'optics',
    iconName: 'Square',
    terminals: [{id: 'sensor', nameKey: 'terminal.sensor', relativeX: 10, relativeY: 50}],
    properties: [],
    descriptionKey: 'glossary.screen.desc',
  },
  {
    type: 'plane_mirror',
    nameKey: 'component.plane_mirror',
    category: 'optics',
    iconName: 'Divide',
    terminals: [
      {id: 'surface_in', nameKey: 'terminal.surface_in', relativeX: 10, relativeY: 50},
      {id: 'surface_out', nameKey: 'terminal.surface_out', relativeX: 90, relativeY: 50},
    ],
    properties: [],
    descriptionKey: 'glossary.lens.desc',
  },
  {
    type: 'concave_mirror',
    nameKey: 'component.concave_mirror',
    category: 'optics',
    iconName: 'Circle',
    terminals: [
      {id: 'surface_in', nameKey: 'terminal.surface_in', relativeX: 10, relativeY: 50},
    ],
    properties: [
      {
        key: 'focalLength',
        nameKey: 'property.focalLength',
        unit: 'cm',
        defaultValue: 20,
        min: 10,
        max: 50,
        step: 2,
      },
    ],
    descriptionKey: 'glossary.lens.desc',
  },
  {
    type: 'optical_prism',
    nameKey: 'component.optical_prism',
    category: 'optics',
    iconName: 'Triangle',
    terminals: [
      {id: 'surface_in', nameKey: 'terminal.surface_in', relativeX: 10, relativeY: 50},
      {id: 'surface_out', nameKey: 'terminal.surface_out', relativeX: 90, relativeY: 50},
    ],
    properties: [
      {
        key: 'apexAngle',
        nameKey: 'property.wavelength',
        unit: '°',
        defaultValue: 60,
        min: 30,
        max: 75,
        step: 5,
      },
    ],
    descriptionKey: 'glossary.lens.desc',
  },
  {
    type: 'optical_slit',
    nameKey: 'component.optical_slit',
    category: 'optics',
    iconName: 'Columns',
    terminals: [
      {id: 'surface_in', nameKey: 'terminal.surface_in', relativeX: 10, relativeY: 50},
      {id: 'surface_out', nameKey: 'terminal.surface_out', relativeX: 90, relativeY: 50},
    ],
    properties: [],
    descriptionKey: 'glossary.lens.desc',
  },
  {
    type: 'beam_splitter',
    nameKey: 'component.beam_splitter',
    category: 'optics',
    iconName: 'GitFork',
    terminals: [
      {id: 'surface_in', nameKey: 'terminal.surface_in', relativeX: 10, relativeY: 50},
      {id: 'surface_out', nameKey: 'terminal.surface_out', relativeX: 90, relativeY: 50},
    ],
    properties: [],
    descriptionKey: 'glossary.lens.desc',
  },
];

export const opticsLessons: Lesson[] = [
  {
    id: 'optics-lesson-1-focal-point',
    titleKey: 'lesson.optics.1.title',
    descriptionKey: 'lesson.optics.1.desc',
    gradeLevel: 9,
    difficulty: 'easy',
    steps: [
      {
        id: 'optics-step-1',
        stepNumber: 1,
        titleKey: 'lesson.optics.1.step.1.title',
        instructionKey: 'lesson.optics.1.step.1.instr',
        hintKey: 'lesson.optics.1.step.1.hint',
        validate: (state: LabState) => {
          const hasLaser = state.components.some((c) => c.type === 'laser_source');
          const hasLens = state.components.some((c) => c.type === 'convex_lens');
          return {
            passed: hasLaser && hasLens,
            feedbackKey: hasLaser && hasLens ? 'lesson.success' : 'lesson.failure',
          };
        },
      },
    ],
  },
  {
    id: 'optics-lesson-2-tir',
    titleKey: 'lesson.optics.1.title',
    descriptionKey: 'lesson.optics.1.desc',
    gradeLevel: 9,
    difficulty: 'medium',
    steps: [
      {
        id: 'optics-step-2',
        stepNumber: 1,
        titleKey: 'lesson.optics.1.step.1.title',
        instructionKey: 'lesson.optics.1.step.1.instr',
        hintKey: 'lesson.optics.1.step.1.hint',
        validate: (state: LabState) => {
          const hasLaser = state.components.some((c) => c.type === 'laser_source');
          const hasPrism = state.components.some((c) => c.type === 'optical_prism');
          return {
            passed: hasLaser && hasPrism,
            feedbackKey: hasLaser && hasPrism ? 'lesson.success' : 'lesson.failure',
          };
        },
      },
    ],
  },
];

function simulateOptics(state: LabState): SimulationResult {
  const hasLaser = state.components.some((c) => c.type === 'laser_source');
  const hasLens = state.components.some((c) => c.type === 'convex_lens' || c.type === 'concave_lens');
  const hasScreen = state.components.some((c) => c.type === 'optical_screen');
  const isAligned = hasLaser && hasLens && hasScreen;

  return {
    isClosedCircuit: isAligned,
    hasShortCircuit: false,
    totalCurrent: isAligned ? 1.0 : hasLaser ? 0.5 : 0,
    totalEquivalentResistance: 0,
    componentStates: {},
    warnings: [],
  };
}

function describeOpticsState(state: LabState): AISummarySnapshot {
  return {
    labId: 'optics-geometric',
    summaryText: `Оптическая скамья с ${state.components.length} элементами (лазеры, линзы, экраны).`,
    isCircuitComplete: state.components.length >= 2,
    hasHazard: false,
    activeComponentsCount: state.components.length,
    components: state.components.map((c) => ({
      id: c.id,
      type: c.type,
      parameters: c.values,
      stateText: 'на оптической оси',
    })),
    connectionsCount: state.wires.length,
  };
}

export const OpticsGeometricModule: LabModule = {
  id: 'optics-geometric',
  titleKey: 'labs.optics.title',
  descriptionKey: 'labs.optics.description',
  discipline: 'optics',
  components: opticsComponentsList,
  simulate: simulateOptics,
  describeState: describeOpticsState,
  lessons: opticsLessons,
  defaultState: {
    components: [
      {
        id: 'laser_1',
        type: 'laser_source',
        x: 140,
        y: 220,
        rotation: 0,
        values: {wavelength: 650},
        state: {},
      },
      {
        id: 'lens_1',
        type: 'convex_lens',
        x: 380,
        y: 220,
        rotation: 0,
        values: {focalLength: 15},
        state: {},
      },
      {
        id: 'screen_1',
        type: 'optical_screen',
        x: 640,
        y: 220,
        rotation: 0,
        values: {},
        state: {},
      },
    ],
    wires: [
      {
        id: 'opt_w1',
        from: {componentId: 'laser_1', terminalId: 'beam_out'},
        to: {componentId: 'lens_1', terminalId: 'surface_in'},
      },
      {
        id: 'opt_w2',
        from: {componentId: 'lens_1', terminalId: 'surface_out'},
        to: {componentId: 'screen_1', terminalId: 'sensor'},
      },
    ],
  },
};
