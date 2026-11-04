/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Full-Stack Server Entry Point
 * Запускает Express с тонким бэкенд-прокси и монтирует Vite middlewares в dev-режиме.
 */

import express from 'express';
import os from 'os';
import path from 'path';
import {fileURLToPath} from 'url';
import dotenv from 'dotenv';
import {apiRouter} from './server/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getNetworkUrls(port: number): string[] {
  const interfaces = os.networkInterfaces();
  const addresses = new Set<string>();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        addresses.add(`http://${entry.address}:${port}`);
      }
    }
  }

  return [...addresses];
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({limit: '25mb'}));

  // Lightweight health-check endpoint for cloud providers (Render, Fly.io, UptimeRobot, GitHub Actions)
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      service: 'ozmo-lab',
    });
  });

  // Монтируем API роутер
  app.use('/api', apiRouter);

  if (!isProd) {
    // В режиме разработки монтируем Vite как middleware
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // В продакшене отдаём статику из dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Ozmo Lab] Local:   http://localhost:${PORT}`);
    for (const url of getNetworkUrls(PORT)) {
      console.log(`[Ozmo Lab] Network: ${url}`);
    }
  });
}

startServer().catch((err) => {
  console.error('[Ozmo Lab] Failed to start server:', err);
  process.exit(1);
});
