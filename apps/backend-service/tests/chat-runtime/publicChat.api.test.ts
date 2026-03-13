import request from 'supertest';

// NODE_ENV and GEMINI_API_KEY are set before loading runtime modules so bootstrapping stays in test mode.
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

const { AppError } = require('../../src/api/v1/errors/AppError') as { AppError: any };
const { ChatRuntimeService } = require('../../src/api/v1/services/ChatRuntimeService') as {
  ChatRuntimeService: { chat: (...args: unknown[]) => Promise<unknown> };
};

// Importing app after env setup ensures startServer side effects remain disabled during integration tests.
// The route pipeline includes rate limiter, validation, controller, and global error handler.
// We mock ChatRuntimeService.chat to keep tests focused on HTTP contract rather than database internals.
const { app } = require('../../src/index') as { app: import('express').Express };

// createValidPayload mirrors a real public widget request that resolves chatbot by domain.
function createValidPayload() {
  return {
    domain: 'acme.example.com',
    message: 'What are your opening hours?',
    history: [{ role: 'user', content: 'Hello there' }]
  };
}

describe('POST /api/v1/public/chat Feature 8.9 API contract tests', () => {
  const originalChat = ChatRuntimeService.chat;

  beforeEach(() => {
    jest.clearAllMocks();
    ChatRuntimeService.chat = originalChat;
  });

  afterAll(() => {
    ChatRuntimeService.chat = originalChat;
  });

  it('should return 200 success envelope when chat runtime returns a valid answer', async () => {
    // Service mock emulates successful orchestration from chatbot lookup to LLM answer generation.
    ChatRuntimeService.chat = jest.fn().mockResolvedValue({
      answer: 'We are open Monday to Friday from 9 AM to 6 PM.',
      sourceItems: [{ entity_id: 10, entity_type: 'SCHEDULE', tags: ['HOURS'] }]
    });

    const response = await request(app).post('/api/v1/public/chat').send(createValidPayload());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.answer).toBeDefined();
    expect(Array.isArray(response.body.data.sourceItems)).toBe(true);
    expect(response.body.error).toBeNull();
  });

  it('should return 404 CHATBOT_NOT_FOUND when service cannot resolve chatbot', async () => {
    // Service mock emulates tenant lookup failure for unknown domain/chatbot references.
    ChatRuntimeService.chat = jest.fn().mockRejectedValue(new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND'));

    const response = await request(app).post('/api/v1/public/chat').send(createValidPayload());

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.data).toBeNull();
    expect(response.body.error.code).toBe('CHATBOT_NOT_FOUND');
  });

  it('should return 400 VALIDATION_ERROR for invalid request body', async () => {
    // Invalid payload bypasses service layer because validation middleware rejects before controller execution.
    const response = await request(app).post('/api/v1/public/chat').send({ message: '' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.data).toBeNull();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 503 LLM_UNAVAILABLE when service maps provider failure to runtime error', async () => {
    // Service mock emulates mapped LLM outage error produced by ChatRuntimeService after LLMError translation.
    ChatRuntimeService.chat = jest
      .fn()
      .mockRejectedValue(new AppError('The answer generation service is temporarily unavailable.', 503, 'LLM_UNAVAILABLE'));

    const response = await request(app).post('/api/v1/public/chat').send(createValidPayload());

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.data).toBeNull();
    expect(response.body.error.code).toBe('LLM_UNAVAILABLE');
  });
});
