/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Photo-to-Circuit Lab Agent — API Endpoint Tests
 */

import {describe, it, expect} from 'vitest';
import express from 'express';
import {apiRouter} from '../../server/index.ts';

describe('Circuit Agent REST API Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  it('GET /api/health returns status ok', async () => {
    const res = await new Promise<{status: number; body: any}>((resolve) => {
      const req = {method: 'GET', url: '/health', headers: {}} as any;
      let statusCode = 200;
      const responseObj: any = {
        status: (code: number) => {
          statusCode = code;
          return responseObj;
        },
        json: (data: any) => resolve({status: statusCode, body: data}),
      };
      apiRouter(req, responseObj, () => {});
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('Ozmo Lab');
  });

  it('GET /api/circuit-agent/presets returns available test circuits', async () => {
    // In-memory request handler test
    const res = await new Promise<{status: number; body: any}>((resolve) => {
      const req = {method: 'GET', url: '/circuit-agent/presets', headers: {}} as any;
      let statusCode = 200;
      const responseObj: any = {
        status: (code: number) => {
          statusCode = code;
          return responseObj;
        },
        json: (data: any) => resolve({status: statusCode, body: data}),
      };
      apiRouter(req, responseObj, () => {});
    });

    expect(res.status).toBe(200);
    expect(res.body.presets).toBeDefined();
    expect(res.body.presets.length).toBeGreaterThanOrEqual(4);
    expect(res.body.presets.some((p: any) => p.id === 'led_missing_resistor')).toBe(true);
  });

  it('POST /api/circuit-agent/verify executes complete agent verification pipeline', async () => {
    const res = await new Promise<{status: number; body: any}>((resolve) => {
      const req = {
        method: 'POST',
        url: '/circuit-agent/verify',
        headers: {'content-type': 'application/json'},
        body: {presetId: 'led_missing_resistor', language: 'ru'},
      } as any;
      let statusCode = 200;
      const responseObj: any = {
        status: (code: number) => {
          statusCode = code;
          return responseObj;
        },
        json: (data: any) => resolve({status: statusCode, body: data}),
      };
      apiRouter(req, responseObj, () => {});
    });

    expect(res.status).toBe(200);
    expect(res.body.runId).toBeDefined();
    expect(res.body.hasMistake).toBe(true);
    expect(res.body.fixedSolution).toBeDefined();
    expect(res.body.explanation.title).toContain('Светодиод');
  });
});
