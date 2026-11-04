/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Express Backend Router с эндпоинтом POST /api/tutor
 */

import express, {Request, Response} from 'express';
import fs from 'fs';
import path from 'path';
import {rateLimiter} from './middleware/rateLimiter.ts';
import {tutorRequestSchema} from './schemas/tutorSchema.ts';
import {streamTutorReply} from './tutorService.ts';

export const apiRouter = express.Router();

// GET /api/health
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Ozmo Lab Backend Proxy',
    version: '1.1.0',
    timestamp: Date.now(),
  });
});

// GET /api/glossary
apiRouter.get('/glossary', (_req: Request, res: Response) => {
  try {
    const glossaryPath = path.resolve(process.cwd(), 'shared/glossary.json');
    if (fs.existsSync(glossaryPath)) {
      const data = fs.readFileSync(glossaryPath, 'utf-8');
      res.json(JSON.parse(data));
    } else {
      res.status(404).json({error: 'Glossary not found'});
    }
  } catch (error) {
    res.status(500).json({error: 'Failed to read glossary', details: String(error)});
  }
});

// GET /api/circuit-agent/presets
apiRouter.get('/circuit-agent/presets', async (_req: Request, res: Response) => {
  const {PRESET_CIRCUITS} = await import('./circuitAgent.ts');
  const presetsList = Object.entries(PRESET_CIRCUITS).map(([id, item]) => ({
    id,
    name: item.name,
    componentsCount: item.netlist.components.length,
    description: item.netlist.metadata?.description,
  }));
  res.json({presets: presetsList});
});

// POST /api/circuit-agent/perceive (Stage 1: extract netlist from photo for student confirmation)
apiRouter.post('/circuit-agent/perceive', rateLimiter, async (req: Request, res: Response) => {
  try {
    const {imageBase64, language} = req.body;
    if (!imageBase64) {
      res.status(400).json({error: 'imageBase64 is required'});
      return;
    }
    const {perceiveCircuitPhoto} = await import('./circuitAgent.ts');
    const result = await perceiveCircuitPhoto(imageBase64, undefined, {language});
    res.json(result);
  } catch (error) {
    console.error('[POST /api/circuit-agent/perceive] Error:', error);
    res.status(500).json({
      error: 'Failed to perceive circuit photograph',
      details: String(error),
    });
  }
});

// POST /api/circuit-agent/verify (Stage 2: deterministic MNA solver, diagnosis, fix synthesis, and explanation)
apiRouter.post('/circuit-agent/verify', rateLimiter, async (req: Request, res: Response) => {
  try {
    const {runPhotoToCircuitAgent, AgentInputError} = await import('./circuitAgent.ts');
    try {
      const result = await runPhotoToCircuitAgent(req.body);
      res.json(result);
    } catch (inner) {
      if (inner instanceof AgentInputError) {
        res.status(400).json({error: inner.message});
        return;
      }
      throw inner;
    }
  } catch (error) {
    console.error('[POST /api/circuit-agent/verify] Error:', error);
    res.status(500).json({
      error: 'Failed to process circuit agent request',
      details: String(error),
    });
  }
});

// POST /api/notebook/route-and-extract (Notebook Photo Mode Router)
apiRouter.post('/notebook/route-and-extract', rateLimiter, async (req: Request, res: Response) => {
  try {
    const {imageBase64, language} = req.body;
    if (!imageBase64) {
      res.status(400).json({error: 'imageBase64 is required'});
      return;
    }
    const {routeAndExtractNotebookPhoto} = await import('./notebookAgent.ts');
    const result = await routeAndExtractNotebookPhoto(imageBase64, {language});

    // If classified as a circuit, also enrich with netlist from circuit agent
    if (result.classification.category === 'circuit') {
      try {
        const {perceiveCircuitPhoto} = await import('./circuitAgent.ts');
        const circuitResult = await perceiveCircuitPhoto(imageBase64, undefined, {language});
        result.circuitNetlist = circuitResult.netlist;
      } catch (cErr) {
        console.warn('[route-and-extract] Circuit enrichment warning:', cErr);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('[POST /api/notebook/route-and-extract] Error:', error);
    res.status(500).json({
      error: 'Failed to route and extract notebook photo',
      details: String(error),
    });
  }
});

// POST /api/notebook/solve (Deterministic Physics Problem Solver)
apiRouter.post('/notebook/solve', rateLimiter, async (req: Request, res: Response) => {
  try {
    const {problemType, centreOfMass, resistanceProblem, language = 'tg'} = req.body;
    const {solveCentreOfMass, solveResistanceProblem} = await import('../shared/solver/physicsSolver.ts');

    if (problemType === 'centre_of_mass') {
      if (!centreOfMass || !centreOfMass.items || centreOfMass.items.length === 0) {
        res.status(400).json({error: 'Valid centreOfMass problem payload is required'});
        return;
      }
      const solution = solveCentreOfMass(centreOfMass);
      const tutor = solution.tutor[language as 'tg' | 'ru' | 'en'] || solution.tutor.tg;
      res.json({problemType: 'centre_of_mass', solution, tutor});
      return;
    }

    if (problemType === 'resistance_circuit') {
      if (!resistanceProblem || !resistanceProblem.resistors || resistanceProblem.resistors.length === 0) {
        res.status(400).json({error: 'Valid resistanceProblem payload is required'});
        return;
      }
      const solution = solveResistanceProblem(resistanceProblem);
      const tutor = solution.tutor[language as 'tg' | 'ru' | 'en'] || solution.tutor.tg;
      res.json({problemType: 'resistance_circuit', solution, tutor});
      return;
    }

    res.status(400).json({error: `Unsupported problemType: ${problemType}`});
  } catch (error) {
    console.error('[POST /api/notebook/solve] Error:', error);
    res.status(500).json({
      error: 'Failed to solve notebook problem',
      details: String(error),
    });
  }
});

/**
 * POST /api/tutor
 * Основной эндпоинт ИИ-наставника с валидацией Zod, Rate Limiting и потоковой передачей SSE.
 */
apiRouter.post('/tutor', rateLimiter, async (req: Request, res: Response) => {
  // Валидация входных данных через Zod
  const parseResult = tutorRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'Validation Error',
      details: parseResult.error.format(),
    });
    return;
  }

  const payload = parseResult.data;

  // Настройка Server-Sent Events (SSE) заголовков
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // отключение буферизации Nginx/прокси

  // Отправка первичного подтверждения соединения
  res.write(': connected\n\n');

  try {
    await streamTutorReply(payload, (chunk: string) => {
      res.write(`data: ${JSON.stringify({text: chunk})}\n\n`);
    });

    // Завершение потока
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('[POST /api/tutor] Stream error:', error);
    res.write(
      `data: ${JSON.stringify({
        error: 'Stream error',
        text:
          payload.language === 'tg'
            ? 'Хатогӣ ҳангоми тавлиди посух. Лутфан, дубора кӯшиш кунед.'
            : payload.language === 'ru'
              ? 'Ошибка при формировании ответа. Пожалуйста, повторите попытку.'
              : 'An error occurred while generating the response. Please try again.',
      })}\n\n`
    );
    res.write('data: [DONE]\n\n');
    res.end();
  }
});
