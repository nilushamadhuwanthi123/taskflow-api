const request = require('supertest');
const app = require('../src/app');

describe('GET /api/stats', () => {
  it('is publicly accessible without auth', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
  });

  it('reports uptime, a growing request total, and a per-method breakdown', async () => {
    const before = await request(app).get('/api/stats');
    const baseline = before.body.totalRequests;

    await request(app).get('/health');
    await request(app).get('/health');

    const after = await request(app).get('/api/stats');

    expect(after.status).toBe(200);
    expect(after.body.uptimeSeconds).toEqual(expect.any(Number));
    expect(after.body.startedAt).toEqual(expect.any(String));
    // 2 health checks + the "before" stats call itself, all counted.
    expect(after.body.totalRequests).toBeGreaterThanOrEqual(baseline + 3);
    expect(after.body.requestsByMethod.GET).toBeGreaterThan(0);
    expect(after.body.requestsByStatusClass['2xx']).toBeGreaterThan(0);
  });

  it('reports the configured auth rate limit', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.body.authRateLimit).toEqual({ windowMs: 15 * 60 * 1000, max: 20 });
  });
});
