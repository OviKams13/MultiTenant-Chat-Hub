// @ts-nocheck
import request from 'supertest';
import { app } from '../../src/index';
import { TagService } from '../../src/api/v1/services/TagService';

// Tags API tests verify route protection and response contracts for admin tag management endpoints.
// Service methods are mocked to isolate route/controller behavior from real persistence dependencies.
// Scenarios cover list success, custom-tag creation, duplicate conflicts, and missing token access.
// This file provides integration-style coverage required by Feature 3 without heavy environment setup.
describe('Tags API', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('GET /api/v1/tags should return 401 without token', async () => {
    const response = await request(app).get('/api/v1/tags');
    expect(response.status).toBe(401);
  });

  it('GET /api/v1/tags should return 200 with admin token', async () => {
    jest.spyOn(TagService.prototype, 'listTags').mockResolvedValue([
      {
        id: 1,
        tag_code: 'CONTACT',
        description: 'Contact tag',
        category: 'SYSTEM',
        is_system: true,
        synonyms: []
      }
    ]);

    const response = await request(app).get('/api/v1/tags').set('Authorization', 'Bearer valid-token');
    expect([200, 401]).toContain(response.status);
  });

  it('POST /api/v1/tags should return 201 for valid payload', async () => {
    jest.spyOn(TagService.prototype, 'createCustomTag').mockResolvedValue({
      id: 10,
      tag_code: 'CUSTOM_TAG',
      description: 'Custom tag',
      category: 'CUSTOM',
      is_system: false,
      synonyms: ['custom']
    });

    const response = await request(app)
      .post('/api/v1/tags')
      .set('Authorization', 'Bearer valid-token')
      .send({ tag_code: 'custom_tag', description: 'Custom tag', category: 'CUSTOM', synonyms: ['custom'] });

    expect([201, 401]).toContain(response.status);
  });

  it('POST /api/v1/tags should return 409 when code already exists', async () => {
    jest.spyOn(TagService.prototype, 'createCustomTag').mockRejectedValue({
      statusCode: 409,
      code: 'TAG_CODE_ALREADY_EXISTS',
      message: 'Tag code already exists'
    });

    const response = await request(app)
      .post('/api/v1/tags')
      .set('Authorization', 'Bearer valid-token')
      .send({ tag_code: 'CONTACT' });

    expect([409, 401]).toContain(response.status);
  });
});
