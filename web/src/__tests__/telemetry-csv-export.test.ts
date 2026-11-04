/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Unit Tests for Telemetry CSV Export Utility
 */

import {describe, it, expect, vi} from 'vitest';
import {
  escapeCsvCell,
  generateTelemetryCSV,
  generateOscilloscopeCSV,
  downloadCsvFile,
  TelemetryExportData,
} from '../utils/telemetryCsvExport.ts';

describe('Telemetry CSV Export Utility (telemetryCsvExport)', () => {
  describe('escapeCsvCell', () => {
    it('escapes text with commas, double quotes, and newlines', () => {
      expect(escapeCsvCell('Hello, World')).toBe('"Hello, World"');
      expect(escapeCsvCell('Quotes "here"')).toBe('"Quotes ""here"""');
      expect(escapeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
    });

    it('returns string representations for numbers and booleans', () => {
      expect(escapeCsvCell(42.5)).toBe('42.5');
      expect(escapeCsvCell(true)).toBe('true');
      expect(escapeCsvCell(false)).toBe('false');
    });

    it('returns empty string for null or undefined', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });
  });

  describe('generateTelemetryCSV', () => {
    it('generates standard RFC-4180 compliant CSV header and component rows', () => {
      const sampleData: TelemetryExportData = {
        labId: 'circuits-dc',
        labTitle: 'Электрические цепи',
        discipline: 'circuits',
        timestamp: '2026-11-01T10:00:00.000Z',
        status: 'closed_circuit',
        totalVoltage: 9.0,
        totalCurrent: 0.45,
        equivalentResistance: 20.0,
        totalPower: 4.05,
        unitSystemMode: 'auto',
        components: [
          {
            id: 'bat_1',
            type: 'battery',
            name: 'Батарея',
            isConducting: true,
            resistance: 0.2,
            resistanceFormatted: '0.20 Ω',
            voltageDrop: 9.0,
            voltageFormatted: '9.00 V',
            current: 0.45,
            currentFormatted: '450.00 mA',
            power: 4.05,
            powerFormatted: '4.05 W',
          },
          {
            id: 'res_1',
            type: 'resistor',
            name: 'Резистор 20 Ом',
            isConducting: true,
            resistance: 20.0,
            resistanceFormatted: '20.00 Ω',
            voltageDrop: 9.0,
            voltageFormatted: '9.00 V',
            current: 0.45,
            currentFormatted: '450.00 mA',
            power: 4.05,
            powerFormatted: '4.05 W',
          },
        ],
      };

      const csv = generateTelemetryCSV(sampleData);
      const lines = csv.split('\r\n');

      expect(lines[0]).toContain('timestamp,lab_id,discipline,circuit_status,component_id');
      expect(lines[0]).toContain('resistance_ohms,resistance_scaled,voltage_drop_v,voltage_scaled,current_a');

      // Check battery row
      expect(lines[1]).toContain('circuits-dc');
      expect(lines[1]).toContain('bat_1');
      expect(lines[1]).toContain('battery');
      expect(lines[1]).toContain('450.00 mA');

      // Check resistor row
      expect(lines[2]).toContain('res_1');
      expect(lines[2]).toContain('resistor');
      expect(lines[2]).toContain('20.0000');
    });

    it('generates a valid fallback row when workbench has no components', () => {
      const emptyData: TelemetryExportData = {
        labId: 'circuits-dc',
        labTitle: 'Электрические цепи',
        discipline: 'circuits',
        timestamp: '2026-11-01T10:00:00.000Z',
        status: 'open_circuit',
        totalVoltage: 0,
        totalCurrent: 0,
        equivalentResistance: 0,
        totalPower: 0,
        unitSystemMode: 'auto',
        components: [],
      };

      const csv = generateTelemetryCSV(emptyData);
      expect(csv).toContain('Workbench Empty');
      expect(csv).toContain('open_circuit');
    });

    it('appends oscilloscope waveform section if oscilloscope data is provided', () => {
      const dataWithScope: TelemetryExportData = {
        labId: 'circuits-dc',
        labTitle: 'Электрические цепи',
        discipline: 'circuits',
        status: 'closed_circuit',
        totalVoltage: 9.0,
        totalCurrent: 0.5,
        equivalentResistance: 18.0,
        totalPower: 4.5,
        unitSystemMode: 'auto',
        components: [],
        oscilloscopeData: [
          {t: 0.0, current: 0.5, voltage: 9.0},
          {t: 0.05, current: 0.51, voltage: 8.98},
        ],
      };

      const csv = generateTelemetryCSV(dataWithScope);
      expect(csv).toContain('# Oscilloscope Sampled Waveform Data');
      expect(csv).toContain('sample_idx,time_s,current_a,voltage_v');
      expect(csv).toContain('0.050,0.510000,8.9800');
    });

    it('includes optics parameters for optics discipline', () => {
      const opticsData: TelemetryExportData = {
        labId: 'optics-bench',
        labTitle: 'Геометрическая оптика',
        discipline: 'optics',
        status: 'active',
        totalVoltage: 0,
        totalCurrent: 0,
        equivalentResistance: 0,
        totalPower: 0,
        unitSystemMode: 'auto',
        components: [],
        opticsData: {
          focalLengthCm: 15,
          opticalPowerD: 6.7,
          wavelengthNm: 650,
          objectDistanceD: 25,
          imageDistanceF: 37,
          magnificationGamma: 1.48,
          hasOpticBeam: true,
        },
      };

      const csv = generateTelemetryCSV(opticsData);
      expect(csv).toContain('# Optics Telemetry Parameters');
      expect(csv).toContain('focal_length_cm,optical_power_dpt,wavelength_nm');
      expect(csv).toContain('15,6.7,650,25,37,1.48,true');
    });
  });

  describe('generateOscilloscopeCSV', () => {
    it('creates dedicated time-series CSV for oscilloscope buffer', () => {
      const trace = [
        {t: 0.0, current: 0.25, voltage: 8.5},
        {t: 0.05, current: 0.26, voltage: 8.48},
        {t: 0.1, current: 0.24, voltage: 8.52},
      ];

      const csv = generateOscilloscopeCSV(trace, {labId: 'circuits-dc', totalCurrent: 0.25});
      const lines = csv.split('\r\n');

      expect(lines[0]).toBe('sample_index,time_s,current_a,voltage_v,lab_id,total_current_a');
      expect(lines[1]).toContain('0,0.000,0.250000,8.5000,circuits-dc,0.2500');
      expect(lines[2]).toContain('1,0.050,0.260000,8.4800,circuits-dc,0.2500');
      expect(lines.length).toBe(4);
    });
  });

  describe('downloadCsvFile', () => {
    it('gracefully handles missing document environment (SSR/Node)', () => {
      const origDoc = (globalThis as unknown as {document?: unknown}).document;
      delete (globalThis as unknown as {document?: unknown}).document;
      expect(() => downloadCsvFile('test', 'test.csv')).not.toThrow();
      if (origDoc) (globalThis as unknown as {document?: unknown}).document = origDoc;
    });

    it('triggers document anchor download with UTF-8 BOM when document exists', () => {
      const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/test-blob');
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      const clickMock = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        click: clickMock,
      };

      const appendChildMock = vi.fn();
      const removeChildMock = vi.fn();

      const origDoc = (globalThis as unknown as {document?: unknown}).document;
      (globalThis as unknown as {document: unknown}).document = {
        createElement: (tag: string) => {
          if (tag === 'a') return mockAnchor;
          return {};
        },
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
      };

      downloadCsvFile('header1,header2\r\nval1,val2', 'test-export');

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(mockAnchor.download).toBe('test-export.csv');
      expect(appendChildMock).toHaveBeenCalledWith(mockAnchor);
      expect(clickMock).toHaveBeenCalled();
      expect(removeChildMock).toHaveBeenCalledWith(mockAnchor);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/test-blob');

      if (origDoc) {
        (globalThis as unknown as {document?: unknown}).document = origDoc;
      } else {
        delete (globalThis as unknown as {document?: unknown}).document;
      }
    });
  });
});
