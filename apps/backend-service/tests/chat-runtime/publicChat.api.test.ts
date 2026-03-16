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

function createValidPayload() {
  return {
    domain: 'acme.example.com',
    message: 'What are your opening hours?',
    history: [{ role: 'user', content: 'Hello there' }]
  };
}

describe('POST /api/v1/public/chat stable API v1 contract', () => {
  const originalChat = ChatRuntimeService.chat;

  beforeEach(() => {
    jest.clearAllMocks();
    ChatRuntimeService.chat = originalChat;
  });

  afterAll(() => {
    ChatRuntimeService.chat = originalChat;
  });

  it('returns 200 stable success envelope with answer and sourceItems', async () => {
    ChatRuntimeService.chat = jest.fn().mockResolvedValue({
      answer: 'We are open Monday to Friday from 9 AM to 6 PM.',
      sourceItems: [{ entity_id: 10, entity_type: 'SCHEDULE', tags: ['HOURS'] }]
    });

    const response = await request(app).post('/api/v1/public/chat').send(createValidPayload());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        answer: 'We are open Monday to Friday from 9 AM to 6 PM.',
        sourceItems: [{ entity_id: 10, entity_type: 'SCHEDULE', tags: ['HOURS'] }]
      },
      error: null
    });
  });

  it('returns 400 VALIDATION_ERROR envelope for invalid payloads', async () => {
    const response = await request(app).post('/api/v1/public/chat').send({ message: '' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.data).toBeNull();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Invalid chat runtime request body');
  });

  it('returns 404 CHATBOT_NOT_FOUND envelope', async () => {
    ChatRuntimeService.chat = jest.fn().mockRejectedValue(new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND'));

    const response = await request(app).post('/api/v1/public/chat').send(createValidPayload());

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'CHATBOT_NOT_FOUND',
        message: 'Chatbot not found'
      }
    });
  });

  it('returns 503 LLM_UNAVAILABLE envelope', async () => {
    ChatRuntimeService.chat = jest
      .fn()
      .mockRejectedValue(new AppError('The answer generation service is temporarily unavailable.', 503, 'LLM_UNAVAILABLE'));

    const response = await request(app).post('/api/v1/public/chat').send(createValidPayload());

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'LLM_UNAVAILABLE',
        message: 'The answer generation service is temporarily unavailable.'
      }
    });
  });

  it('returns 500 INTERNAL_ERROR for unexpected failures', async () => {
    ChatRuntimeService.chat = jest.fn().mockRejectedValue(new Error('boom'));

    const response = await request(app).post('/api/v1/public/chat').send(createValidPayload());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred.'
      }
    });
  });

  it('returns 429 RATE_LIMIT_EXCEEDED when the public runtime limiter threshold is crossed', async () => {
    ChatRuntimeService.chat = jest.fn().mockResolvedValue({
      answer: 'ok',
      sourceItems: []
    });

    const responses = [];
    for (let i = 0; i < 21; i += 1) {
      const response = await request(app).post('/api/v1/public/chat').send(createValidPayload());
      responses.push(response);
    }

    const lastResponse = responses[responses.length - 1];

    expect(lastResponse.status).toBe(429);
    expect(lastResponse.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many chat requests, please retry in a moment.'
      }
    });
  });
});
