/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Утилита экспорта телеметрии в CSV
 * Формирует валидные CSV файлы для анализа в MS Excel, Google Таблицах, Origin и Python (Pandas)
 */

export interface TelemetryComponentItem {
  id: string;
  type: string;
  name: string;
  isConducting: boolean;
  resistance: number;
  resistanceFormatted: string;
  voltageDrop: number;
  voltageFormatted: string;
  current: number;
  currentFormatted: string;
  power: number;
  powerFormatted: string;
  nominalValues?: Record<string, unknown>;
}

export interface TelemetryExportData {
  labId: string;
  labTitle: string;
  discipline: string;
  timestamp?: string;
  status: string;
  totalVoltage: number;
  totalCurrent: number;
  equivalentResistance: number;
  totalPower: number;
  unitSystemMode: string;
  components: TelemetryComponentItem[];
  oscilloscopeData?: Array<{
    t: number;
    current: number;
    voltage: number;
  }>;
  opticsData?: {
    focalLengthCm: number;
    opticalPowerD: number;
    wavelengthNm: number;
    objectDistanceD: number;
    imageDistanceF: number;
    magnificationGamma: number;
    hasOpticBeam: boolean;
  };
  biologyData?: {
    totalMagnification: number;
    fieldOfViewUm: number;
    resolutionUm: number;
    isSampleMounted: boolean;
    observedOrganelles: Record<string, boolean>;
  };
}

/**
 * Безопасно экранирует ячейку CSV по стандарту RFC 4180
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Генерирует строку CSV с телеметрией лабораторного эксперимента
 */
export function generateTelemetryCSV(data: TelemetryExportData): string {
  const timestamp = data.timestamp || new Date().toISOString();
  const rows: string[] = [];

  // Заголовок столбцов таблицы телеметрии компонентов и схемы
  const headers = [
    'timestamp',
    'lab_id',
    'discipline',
    'circuit_status',
    'component_id',
    'component_type',
    'component_name',
    'is_conducting',
    'resistance_ohms',
    'resistance_scaled',
    'voltage_drop_v',
    'voltage_scaled',
    'current_a',
    'current_scaled',
    'power_w',
    'power_scaled',
    'circuit_total_voltage_v',
    'circuit_total_current_a',
    'circuit_equiv_resistance_ohms',
    'circuit_total_power_w',
    'unit_system_mode',
  ];
  rows.push(headers.map(escapeCsvCell).join(','));

  if (data.components.length > 0) {
    for (const comp of data.components) {
      const row = [
        timestamp,
        data.labId,
        data.discipline,
        data.status,
        comp.id,
        comp.type,
        comp.name,
        comp.isConducting,
        comp.resistance.toFixed(4),
        comp.resistanceFormatted,
        comp.voltageDrop.toFixed(4),
        comp.voltageFormatted,
        comp.current.toFixed(6),
        comp.currentFormatted,
        comp.power.toFixed(6),
        comp.powerFormatted,
        data.totalVoltage.toFixed(2),
        data.totalCurrent.toFixed(4),
        data.equivalentResistance.toFixed(2),
        data.totalPower.toFixed(4),
        data.unitSystemMode,
      ];
      rows.push(row.map(escapeCsvCell).join(','));
    }
  } else {
    // Если компонентов нет на столе, записываем сводную строку системы
    const emptyRow = [
      timestamp,
      data.labId,
      data.discipline,
      data.status,
      'none',
      'none',
      'Workbench Empty',
      false,
      '0.0000',
      '0.00 Ω',
      '0.0000',
      '0.00 V',
      '0.000000',
      '0.00 A',
      '0.000000',
      '0.00 W',
      data.totalVoltage.toFixed(2),
      data.totalCurrent.toFixed(4),
      data.equivalentResistance.toFixed(2),
      data.totalPower.toFixed(4),
      data.unitSystemMode,
    ];
    rows.push(emptyRow.map(escapeCsvCell).join(','));
  }

  // Дополнительный раздел оптики, если применимо
  if (data.discipline === 'optics' && data.opticsData) {
    rows.push('');
    rows.push('# Optics Telemetry Parameters');
    rows.push([
      'focal_length_cm',
      'optical_power_dpt',
      'wavelength_nm',
      'object_distance_cm',
      'image_distance_cm',
      'magnification',
      'beam_active',
    ].map(escapeCsvCell).join(','));
    rows.push([
      data.opticsData.focalLengthCm,
      data.opticsData.opticalPowerD,
      data.opticsData.wavelengthNm,
      data.opticsData.objectDistanceD,
      data.opticsData.imageDistanceF,
      data.opticsData.magnificationGamma,
      data.opticsData.hasOpticBeam,
    ].map(escapeCsvCell).join(','));
  }

  // Дополнительный раздел биологии, если применимо
  if (data.discipline === 'biology' && data.biologyData) {
    rows.push('');
    rows.push('# Biology Microscopy Parameters');
    rows.push([
      'total_magnification',
      'field_of_view_um',
      'resolution_um',
      'sample_mounted',
      'observed_organelles',
    ].map(escapeCsvCell).join(','));
    const observedList = Object.entries(data.biologyData.observedOrganelles)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join('; ');
    rows.push([
      data.biologyData.totalMagnification,
      data.biologyData.fieldOfViewUm,
      data.biologyData.resolutionUm,
      data.biologyData.isSampleMounted,
      observedList,
    ].map(escapeCsvCell).join(','));
  }

  // Дополнительный раздел точек осциллографа при их наличии
  if (data.oscilloscopeData && data.oscilloscopeData.length > 0) {
    rows.push('');
    rows.push('# Oscilloscope Sampled Waveform Data');
    rows.push(['sample_idx', 'time_s', 'current_a', 'voltage_v'].map(escapeCsvCell).join(','));
    data.oscilloscopeData.forEach((pt, idx) => {
      rows.push([idx, pt.t.toFixed(3), pt.current.toFixed(6), pt.voltage.toFixed(4)].map(escapeCsvCell).join(','));
    });
  }

  return rows.join('\r\n');
}

/**
 * Генерирует CSV исключительно для точек осциллографа
 */
export function generateOscilloscopeCSV(
  data: Array<{t: number; current: number; voltage: number}>,
  meta?: {labId?: string; totalCurrent?: number}
): string {
  const rows: string[] = [];
  rows.push(['sample_index', 'time_s', 'current_a', 'voltage_v', 'lab_id', 'total_current_a'].map(escapeCsvCell).join(','));

  data.forEach((pt, idx) => {
    rows.push([
      idx,
      pt.t.toFixed(3),
      pt.current.toFixed(6),
      pt.voltage.toFixed(4),
      meta?.labId || 'circuits',
      (meta?.totalCurrent || 0).toFixed(4),
    ].map(escapeCsvCell).join(','));
  });

  return rows.join('\r\n');
}

/**
 * Скачивает сгенерированный CSV файл в браузере с добавлением UTF-8 BOM
 */
export function downloadCsvFile(csvContent: string, fileName: string): void {
  if (typeof document === 'undefined') return;
  // Добавляем UTF-8 BOM (\uFEFF) для корректного открытия кириллицы и спецсимволов (Ω, µ) в MS Excel
  const blob = new Blob(['\uFEFF' + csvContent], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
