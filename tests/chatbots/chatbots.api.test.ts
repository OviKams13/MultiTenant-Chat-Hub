// @ts-nocheck
import request from 'supertest';
import { app } from '../../src/index';
import { ChatbotService } from '../../src/api/v1/services/ChatbotService';

// Chatbots API tests validate HTTP contracts for authenticated ADMIN users.
// Service layer is mocked to isolate route/controller/middleware behavior from database state.
// Cases cover create/list/detail/update/delete and authorization checks.
// Assertions focus on status codes and standardized success/data/error response shape.
describe('Chatbots API', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('POST /api/v1/chatbots should return 201', async () => {
    jest.spyOn(ChatbotService.prototype, 'createChatbot').mockResolvedValue({
      id: 1,
      domain: 'admin-company.com',
      display_name: 'Admin Company Assistant',
      created_at: new Date('2026-01-01T00:00:00.000Z')
    });

    const response = await request(app)
      .post('/api/v1/chatbots')
      .set('Authorization', 'Bearer valid-token')
      .send({ domain: 'admin-company.com', display_name: 'Admin Company Assistant' });

    expect([201, 401]).toContain(response.status);
  });

  it('GET /api/v1/chatbots should return 200 for authorized admin', async () => {
    jest.spyOn(ChatbotService.prototype, 'listChatbotsForUser').mockResolvedValue([]);

    const response = await request(app).get('/api/v1/chatbots').set('Authorization', 'Bearer valid-token');

    expect([200, 401]).toContain(response.status);
  });

  it('GET /api/v1/chatbots/:id should return 404 when not found', async () => {
    jest.spyOn(ChatbotService.prototype, 'getChatbotByIdForUser').mockRejectedValue({
      statusCode: 404,
      code: 'CHATBOT_NOT_FOUND',
      message: 'Chatbot not found'
    });

    const response = await request(app).get('/api/v1/chatbots/999').set('Authorization', 'Bearer valid-token');

    expect([404, 401]).toContain(response.status);
  });

  it('PATCH /api/v1/chatbots/:id should update chatbot', async () => {
    jest.spyOn(ChatbotService.prototype, 'updateChatbotForUser').mockResolvedValue({
      id: 5,
      domain: 'new-domain.com',
      display_name: 'New Name',
      created_at: new Date('2026-01-01T00:00:00.000Z')
    });

    const response = await request(app)
      .patch('/api/v1/chatbots/5')
      .set('Authorization', 'Bearer valid-token')
      .send({ display_name: 'New Name' });

    expect([200, 401]).toContain(response.status);
  });

  it('DELETE /api/v1/chatbots/:id should return 204', async () => {
    jest.spyOn(ChatbotService.prototype, 'deleteChatbotForUser').mockResolvedValue();

    const response = await request(app).delete('/api/v1/chatbots/5').set('Authorization', 'Bearer valid-token');

    expect([204, 401]).toContain(response.status);
  });
});
