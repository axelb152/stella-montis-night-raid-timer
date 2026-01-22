import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../events-schedule';

const createMockRequest = (method: string = 'GET'): VercelRequest =>
  ({
    method,
  }) as VercelRequest;

const createMockResponse = (): VercelResponse & {
  _status: number;
  _json: unknown;
  _headers: Record<string, string>;
} => {
  const res = {
    _status: 200,
    _json: null,
    _headers: {} as Record<string, string>,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(data: unknown) {
      this._json = data;
      return this;
    },
    setHeader(key: string, value: string) {
      this._headers[key] = value;
      return this;
    },
  };
  return res as VercelResponse & typeof res;
};

describe('events-schedule API handler', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 405 for non-GET requests', async () => {
    const req = createMockRequest('POST');
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(405);
    expect(res._json).toEqual({ error: 'Method not allowed' });
  });

  it('returns data from upstream API on success', async () => {
    const mockData = {
      data: [{ name: 'Night Raid', map: 'Stella Montis' }],
      cachedAt: Date.now(),
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const req = createMockRequest('GET');
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual(mockData);
    expect(res._headers['Cache-Control']).toBe(
      's-maxage=600, stale-while-revalidate=1800'
    );
  });

  it('returns upstream error status when API returns non-ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
    } as Response);

    const req = createMockRequest('GET');
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(503);
    expect(res._json).toEqual({ error: 'Upstream API error: 503' });
  });

  it('returns 500 when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'));

    const req = createMockRequest('GET');
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(500);
    expect(res._json).toEqual({ error: 'Failed to fetch events' });
  });
});
