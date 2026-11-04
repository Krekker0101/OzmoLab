/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Unit Tests for Rate Limiter & Global Safety Cap
 */

import {describe, it, expect, beforeEach} from 'vitest';
import {rateLimiter, recordClientTokens, _resetRateLimiterStores} from '../middleware/rateLimiter.ts';
import type {Request, Response, NextFunction} from 'express';

function createMockReqRes(ip = '192.168.1.10') {
  const req = {
    headers: {'x-forwarded-for': ip},
    socket: {remoteAddress: ip},
    ip,
  } as unknown as Request;

  let statusCode = 200;
  let jsonBody: any = null;
  const headers: Record<string, string> = {};

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(body: any) {
      jsonBody = body;
      return res;
    },
    setHeader(name: string, value: string) {
      headers[name] = value;
      return res;
    },
  } as unknown as Response;

  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  return {
    req,
    res,
    next,
    getStatus: () => statusCode,
    getBody: () => jsonBody,
    getHeaders: () => headers,
    wasNextCalled: () => nextCalled,
  };
}

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    _resetRateLimiterStores();
  });

  it('allows normal requests and sets rate limit headers', () => {
    const {req, res, next, wasNextCalled, getStatus, getHeaders} = createMockReqRes('10.0.0.1');
    rateLimiter(req, res, next);

    expect(wasNextCalled()).toBe(true);
    expect(getStatus()).toBe(200);
    expect(getHeaders()['X-RateLimit-Limit']).toBe('30');
    expect(getHeaders()['X-RateLimit-Remaining']).toBe('29');
  });

  it('blocks single IP after 30 requests within 1 minute with localized message', () => {
    const ip = '10.0.0.2';
    // Run 30 requests
    for (let i = 0; i < 30; i++) {
      const mock = createMockReqRes(ip);
      rateLimiter(mock.req, mock.res, mock.next);
      expect(mock.wasNextCalled()).toBe(true);
    }

    // 31st request from same IP should be blocked
    const blocked = createMockReqRes(ip);
    rateLimiter(blocked.req, blocked.res, blocked.next);

    expect(blocked.wasNextCalled()).toBe(false);
    expect(blocked.getStatus()).toBe(429);
    expect(blocked.getBody().error).toBe('Too Many Requests');
    expect(blocked.getBody().message).toContain('дар як дақиқа');
    expect(blocked.getBody().message).toContain('Слишком много запросов');
    expect(blocked.getHeaders()['Retry-After']).toBe('60');
  });

  it('isolates different IPs so one IP limit does not block another IP', () => {
    const ipA = '10.0.0.10';
    const ipB = '10.0.0.20';

    // Exhaust IP A
    for (let i = 0; i < 30; i++) {
      const mock = createMockReqRes(ipA);
      rateLimiter(mock.req, mock.res, mock.next);
    }

    // IP A is blocked
    const blockedA = createMockReqRes(ipA);
    rateLimiter(blockedA.req, blockedA.res, blockedA.next);
    expect(blockedA.getStatus()).toBe(429);

    // IP B is still allowed
    const freshB = createMockReqRes(ipB);
    rateLimiter(freshB.req, freshB.res, freshB.next);
    expect(freshB.wasNextCalled()).toBe(true);
    expect(freshB.getStatus()).toBe(200);
  });

  it('enforces per-IP hourly token cap (40,000 tokens)', () => {
    const ip = '10.0.0.50';
    recordClientTokens(ip, 40001);

    const mock = createMockReqRes(ip);
    rateLimiter(mock.req, mock.res, mock.next);

    expect(mock.wasNextCalled()).toBe(false);
    expect(mock.getStatus()).toBe(429);
    expect(mock.getBody().error).toBe('Hourly Token Cap Exceeded');
    expect(mock.getBody().message).toContain('Лимити соатии ИИ барои дастгоҳи шумо');
  });

  it('enforces global request safety cap (100 req/min across distributed IPs)', () => {
    // Generate 100 requests from 100 distinct IPs
    for (let i = 0; i < 100; i++) {
      const mock = createMockReqRes(`192.168.100.${i}`);
      rateLimiter(mock.req, mock.res, mock.next);
      expect(mock.wasNextCalled()).toBe(true);
    }

    // 101st request from a brand new IP triggers global protection
    const mock101 = createMockReqRes('192.168.100.250');
    rateLimiter(mock101.req, mock101.res, mock101.next);

    expect(mock101.wasNextCalled()).toBe(false);
    expect(mock101.getStatus()).toBe(429);
    expect(mock101.getBody().error).toBe('Global Rate Limit Exceeded');
    expect(mock101.getBody().message).toContain('Сервер муваққатан');
    expect(mock101.getBody().message).toContain('перегружен');
  });
});
