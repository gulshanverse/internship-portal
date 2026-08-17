import { describe, expect, it, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { rateLimit, resetRateLimitBucketsForTests, securityHeaders } from './security';

describe('security middleware', () => {
  beforeEach(() => resetRateLimitBucketsForTests());

  it('sets defensive response headers', () => {
    const headers = new Map<string, string>();
    const res = { setHeader: (key: string, value: string) => headers.set(key, value) } as unknown as Response;
    let continued = false;
    securityHeaders({} as Request, res, () => { continued = true; });
    expect(continued).toBe(true);
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('rejects requests after the configured limit', () => {
    const middleware = rateLimit({ windowMs: 60_000, max: 2, key: () => 'test' });
    const statuses: number[] = [];
    const req = {} as Request;
    const makeRes = () => ({ setHeader: () => undefined, status: (code: number) => { statuses.push(code); return { json: () => undefined }; } }) as unknown as Response;
    let nextCalls = 0;
    middleware(req, makeRes(), () => { nextCalls += 1; });
    middleware(req, makeRes(), () => { nextCalls += 1; });
    middleware(req, makeRes(), () => { nextCalls += 1; });
    expect(nextCalls).toBe(2);
    expect(statuses).toEqual([429]);
  });
});
