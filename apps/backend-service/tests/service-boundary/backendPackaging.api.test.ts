import request from 'supertest';

describe('Backend service packaging boundary endpoints', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-key';
  });

  it('serves a stable health endpoint', async () => {
    const { createApp } = await import('../../src/app');
    const app = createApp();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('@mth/backend-service');
    expect(typeof response.body.uptimeSeconds).toBe('number');
  });

  it('exposes OpenAPI JSON and docs landing route', async () => {
    const { createApp } = await import('../../src/app');
    const app = createApp();

    const docsResponse = await request(app).get('/api-docs');
    expect(docsResponse.status).toBe(200);
    expect(docsResponse.text).toContain('/api-docs.json');

    const specResponse = await request(app).get('/api-docs.json');
    expect(specResponse.status).toBe(200);
    expect(specResponse.body.openapi).toBe('3.0.0');
    expect(specResponse.body.paths).toBeDefined();
  });
});
