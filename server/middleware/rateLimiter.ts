/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Rate Limiter Middleware по IP
 */

import {Request, Response, NextFunction} from 'express';

interface RateLimitRecord {
  timestamps: number[];
  hourlyTokens: number;
  hourResetTime: number;
}

const WINDOW_MS = 60 * 1000; // 1 минута

// Лимиты на одно устройство / IP-клиента
const PER_IP_MAX_REQUESTS = 30; // 30 запросов в минуту на IP
const PER_IP_HOURLY_TOKENS = 40000; // 40,000 токенов в час на IP

// Глобальный защитный лимит сервера (защита от разорения баланса и DDoS)
const GLOBAL_MAX_REQUESTS = 100; // 100 запросов в минуту суммарно
const GLOBAL_HOURLY_TOKENS = 120000; // 120,000 токенов в час суммарно

const ipStore = new Map<string, RateLimitRecord>();
const globalRecord: RateLimitRecord = {
  timestamps: [],
  hourlyTokens: 0,
  hourResetTime: Date.now() + 3600 * 1000,
};

// Периодическая очистка устаревших записей каждые 5 минут
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  globalRecord.timestamps = globalRecord.timestamps.filter((ts) => now - ts < WINDOW_MS);
  if (now > globalRecord.hourResetTime && globalRecord.timestamps.length === 0) {
    globalRecord.hourlyTokens = 0;
    globalRecord.hourResetTime = now + 3600 * 1000;
  }

  for (const [ip, record] of ipStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);
    if (now > record.hourResetTime && record.timestamps.length === 0) {
      ipStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const clientIp =
    (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1';

  const now = Date.now();

  // 1. Проверка глобального почасового сброса
  if (now > globalRecord.hourResetTime) {
    globalRecord.hourlyTokens = 0;
    globalRecord.hourResetTime = now + 3600 * 1000;
  }
  globalRecord.timestamps = globalRecord.timestamps.filter((ts) => now - ts < WINDOW_MS);

  // 2. Проверка глобального лимита запросов
  if (globalRecord.timestamps.length >= GLOBAL_MAX_REQUESTS) {
    if (typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', '60');
    }
    res.status(429).json({
      error: 'Global Rate Limit Exceeded',
      message:
        'Сервер муваққатан аз сабаби сарбории баланд банд аст. Лутфан, баъди 1 дақиқа дубора кӯшиш кунед. / Сервер временно перегружен. Пожалуйста, подождите 1 минуту. / Server is temporarily busy with high global load. Please wait 1 minute.',
    });
    return;
  }

  // 3. Проверка глобального лимита токенов
  if (globalRecord.hourlyTokens >= GLOBAL_HOURLY_TOKENS) {
    const secondsRemaining = Math.max(1, Math.ceil((globalRecord.hourResetTime - now) / 1000));
    if (typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', String(secondsRemaining));
    }
    res.status(429).json({
      error: 'Global Token Cap Exceeded',
      message:
        'Буҷети умумии соатии ИИ ба охир расид. Лутфан, дар оғози соати оянда дубора кӯшиш кунед. / Общий почасовой бюджет ИИ исчерпан. Пожалуйста, повторите в следующем часу. / Global hourly AI budget cap reached. Please try again next hour.',
    });
    return;
  }

  // 4. Проверка и инициализация записи для конкретного IP
  let record = ipStore.get(clientIp);
  if (!record) {
    record = {timestamps: [], hourlyTokens: 0, hourResetTime: now + 3600 * 1000};
    ipStore.set(clientIp, record);
  }

  if (now > record.hourResetTime) {
    record.hourlyTokens = 0;
    record.hourResetTime = now + 3600 * 1000;
  }
  record.timestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);

  // 5. Проверка лимита запросов для IP
  if (record.timestamps.length >= PER_IP_MAX_REQUESTS) {
    if (typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', '60');
    }
    res.status(429).json({
      error: 'Too Many Requests',
      message:
        'Шумо дар як дақиқа аз ҳад зиёд дархост фиристодед. Лутфан, 1 дақиқа интизор шавед. / Слишком много запросов с вашего устройства. Пожалуйста, подождите 1 минуту. / Too many requests from your device. Please wait 1 minute.',
    });
    return;
  }

  // 6. Проверка лимита токенов для IP
  if (record.hourlyTokens >= PER_IP_HOURLY_TOKENS) {
    const secondsRemaining = Math.max(1, Math.ceil((record.hourResetTime - now) / 1000));
    if (typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', String(secondsRemaining));
    }
    res.status(429).json({
      error: 'Hourly Token Cap Exceeded',
      message:
        'Лимити соатии ИИ барои дастгоҳи шумо ба охир расид. Лутфан, дертар кӯшиш кунед. / Почасовой лимит использования ИИ для вашего устройства исчерпан. Пожалуйста, повторите позже. / Hourly AI token budget exceeded for this device. Please try again later.',
    });
    return;
  }

  // Успешный учет запроса
  record.timestamps.push(now);
  globalRecord.timestamps.push(now);

  if (typeof res.setHeader === 'function') {
    res.setHeader('X-RateLimit-Limit', String(PER_IP_MAX_REQUESTS));
    res.setHeader('X-RateLimit-Remaining', String(PER_IP_MAX_REQUESTS - record.timestamps.length));
  }

  next();
}

export function recordClientTokens(clientIp: string, tokens: number): void {
  let record = ipStore.get(clientIp);
  if (!record) {
    record = {timestamps: [], hourlyTokens: 0, hourResetTime: Date.now() + 3600 * 1000};
    ipStore.set(clientIp, record);
  }
  record.hourlyTokens += tokens;
  globalRecord.hourlyTokens += tokens;
}

// Хелперы для тестов и инспекции состояния
export function _resetRateLimiterStores(): void {
  ipStore.clear();
  globalRecord.timestamps = [];
  globalRecord.hourlyTokens = 0;
  globalRecord.hourResetTime = Date.now() + 3600 * 1000;
}
