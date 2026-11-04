/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Плагин лаборатории «Микроскопия и биология клетки»
 * Реализует контракт LabModule для биологического практикума.
 */

import {
  AISummarySnapshot,
  ComponentDefinition,
  LabModule,
  LabState,
  Lesson,
  SimulationResult,
} from '../../../../shared/types.ts';

export const biologyComponentsList: ComponentDefinition[] = [
  {
    type: 'microscope',
    nameKey: 'component.microscope',
    category: 'biology',
    iconName: 'Maximize',
    terminals: [{id: 'stage', nameKey: 'terminal.stage', relativeX: 50, relativeY: 50}],
    properties: [
      {
        key: 'magnification',
        nameKey: 'property.magnification',
        unit: 'x',
        defaultValue: 400,
        min: 100,
        max: 1200,
        step: 100,
      },
      {
        key: 'focus',
        nameKey: 'property.focus',
        unit: '%',
        defaultValue: 85,
        min: 0,
        max: 100,
        step: 5,
      },
    ],
    descriptionKey: 'glossary.microscope.desc',
  },
  {
    type: 'slide_sample',
    nameKey: 'component.slide_sample',
    category: 'biology',
    iconName: 'FileText',
    terminals: [{id: 'mount', nameKey: 'terminal.mount', relativeX: 50, relativeY: 50}],
    properties: [
      {
        key: 'sample_type',
        nameKey: 'property.sample_type',
        unit: 'id',
        defaultValue: 1, // 1: onion, 2: animal_epithelium, 3: bacteria, 4: blood, 5: paramecium
        min: 1,
        max: 5,
        step: 1,
      },
    ],
    descriptionKey: 'glossary.slide.desc',
  },
  {
    type: 'staining_agent',
    nameKey: 'component.staining_agent',
    category: 'biology',
    iconName: 'Droplet',
    terminals: [{id: 'drop', nameKey: 'terminal.stage', relativeX: 50, relativeY: 50}],
    properties: [
      {
        key: 'stain',
        nameKey: 'property.stain',
        unit: 'id',
        defaultValue: 1, // 1: lugol, 2: methylene
        min: 1,
        max: 2,
        step: 1,
      },
    ],
    descriptionKey: 'glossary.slide.desc',
  },
  {
    type: 'pipette',
    nameKey: 'component.pipette',
    category: 'biology',
    iconName: 'Droplet',
    terminals: [{id: 'tip', nameKey: 'terminal.stage', relativeX: 50, relativeY: 50}],
    properties: [],
    descriptionKey: 'glossary.pipette.desc',
  },
  {
    type: 'cover_slip',
    nameKey: 'component.cover_slip',
    category: 'biology',
    iconName: 'Square',
    terminals: [{id: 'cover', nameKey: 'terminal.mount', relativeX: 50, relativeY: 50}],
    properties: [],
    descriptionKey: 'glossary.cover_slip.desc',
  },
  {
    type: 'petri_dish',
    nameKey: 'component.petri_dish',
    category: 'biology',
    iconName: 'Circle',
    terminals: [{id: 'dish', nameKey: 'terminal.stage', relativeX: 50, relativeY: 50}],
    properties: [],
    descriptionKey: 'glossary.slide.desc',
  },
];

export const biologyLessons: Lesson[] = [
  {
    id: 'bio-lesson-1-plant-cell',
    titleKey: 'lesson.bio.1.title',
    descriptionKey: 'lesson.bio.1.desc',
    gradeLevel: 7,
    difficulty: 'easy',
    steps: [
      {
        id: 'bio-step-1',
        stepNumber: 1,
        titleKey: 'lesson.bio.1.step.1.title',
        instructionKey: 'lesson.bio.1.step.1.instr',
        hintKey: 'lesson.bio.1.step.1.hint',
        validate: (state: LabState) => {
          const hasMicroscope = state.components.some((c) => c.type === 'microscope');
          const hasSlide = state.components.some((c) => c.type === 'slide_sample');
          const passed = hasMicroscope && hasSlide;
          return {
            passed,
            feedbackKey: passed ? 'lesson.success' : 'lesson.failure',
          };
        },
      },
    ],
  },
  {
    id: 'bio-lesson-2-identify-nucleus',
    titleKey: 'lesson.bio.2.title',
    descriptionKey: 'lesson.bio.2.desc',
    gradeLevel: 8,
    difficulty: 'medium',
    steps: [
      {
        id: 'bio-step-2',
        stepNumber: 1,
        titleKey: 'lesson.bio.2.step.1.title',
        instructionKey: 'lesson.bio.2.step.1.instr',
        hintKey: 'lesson.bio.2.step.1.hint',
        validate: (state: LabState) => {
          const mic = state.components.find((c) => c.type === 'microscope');
          const hasSlide = state.components.some((c) => c.type === 'slide_sample');
          const hasStain = state.components.some((c) => c.type === 'staining_agent' || c.type === 'pipette');
          const magOk = (mic?.values.magnification ?? 0) >= 400;
          const passed = Boolean(mic && hasSlide && (hasStain || magOk));
          return {
            passed,
            feedbackKey: passed ? 'lesson.success' : 'lesson.failure',
          };
        },
      },
    ],
  },
  {
    id: 'bio-lesson-3-compare-cells',
    titleKey: 'lesson.bio.3.title',
    descriptionKey: 'lesson.bio.3.desc',
    gradeLevel: 9,
    difficulty: 'advanced',
    steps: [
      {
        id: 'bio-step-3',
        stepNumber: 1,
        titleKey: 'lesson.bio.3.step.1.title',
        instructionKey: 'lesson.bio.3.step.1.instr',
        hintKey: 'lesson.bio.3.step.1.hint',
        validate: (state: LabState) => {
          const mic = state.components.find((c) => c.type === 'microscope');
          const slide = state.components.find((c) => c.type === 'slide_sample');
          const isAnimalOrBlood = slide && ((slide.values.sample_type ?? 1) >= 2 || slide.state.sampleType === 'animal_epithelium' || slide.state.sampleType === 'blood');
          const passed = Boolean(mic && isAnimalOrBlood);
          return {
            passed,
            feedbackKey: passed ? 'lesson.success' : 'lesson.failure',
          };
        },
      },
    ],
  },
];

function simulateBiology(state: LabState): SimulationResult {
  const microscope = state.components.find((c) => c.type === 'microscope');
  const slide = state.components.find((c) => c.type === 'slide_sample');
  const isReady = Boolean(microscope && slide);

  const magnification = microscope?.values.magnification || 400;
  const componentStates: SimulationResult['componentStates'] = {};

  state.components.forEach((c) => {
    componentStates[c.id] = {
      current: isReady ? magnification : 0,
      voltageDrop: isReady ? 1 : 0,
      power: isReady ? 0.5 : 0,
      status: isReady ? 'normal' : 'open',
    };
  });

  return {
    isClosedCircuit: isReady,
    hasShortCircuit: false,
    totalCurrent: isReady ? magnification : 0,
    totalEquivalentResistance: 0,
    componentStates,
    warnings: isReady
      ? []
      : [
          {
            code: 'OPEN_CIRCUIT',
            messageKey: 'journal.bio.sample_none',
          },
        ],
  };
}

function describeBiologyState(state: LabState): AISummarySnapshot {
  const mic = state.components.find((c) => c.type === 'microscope');
  const slide = state.components.find((c) => c.type === 'slide_sample');
  const mag = mic?.values.magnification || 400;

  return {
    labId: 'biology-microscopy',
    summaryText: `Биологический лабораторный стол: исследовано ${state.components.length} компонентов. Объектив: ${mag}x. Слайд: ${slide ? 'зафиксирован на предметном столике' : 'отсутствует'}.`,
    isCircuitComplete: Boolean(mic && slide),
    hasHazard: false,
    activeComponentsCount: state.components.length,
    components: state.components.map((c) => ({
      id: c.id,
      type: c.type,
      parameters: c.values,
      stateText: c.type === 'microscope' ? `${c.values.magnification || 400}x` : 'в фокусе',
    })),
    connectionsCount: state.wires.length,
  };
}

export const BiologyMicroscopyModule: LabModule = {
  id: 'biology-microscopy',
  titleKey: 'labs.biology.title',
  descriptionKey: 'labs.biology.description',
  discipline: 'biology',
  components: biologyComponentsList,
  simulate: simulateBiology,
  describeState: describeBiologyState,
  lessons: biologyLessons,
  defaultState: {
    components: [
      {
        id: 'micro_1',
        type: 'microscope',
        x: 260,
        y: 200,
        rotation: 0,
        values: {magnification: 400, focus: 85},
        state: {},
      },
      {
        id: 'slide_1',
        type: 'slide_sample',
        x: 520,
        y: 200,
        rotation: 0,
        values: {sample_type: 1},
        state: {sampleType: 'onion', stainType: 'lugol'},
      },
      {
        id: 'pipette_1',
        type: 'pipette',
        x: 740,
        y: 200,
        rotation: 0,
        values: {},
        state: {},
      },
    ],
    wires: [
      {
        id: 'bio_w1',
        from: {componentId: 'slide_1', terminalId: 'mount'},
        to: {componentId: 'micro_1', terminalId: 'stage'},
      },
    ],
  },
};
