import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

const { app } = require('../../src/index') as { app: import('express').Express };
const { ChatbotModel } = require('../../src/api/v1/models/ChatbotModel') as {
  ChatbotModel: { findOne: (...args: unknown[]) => Promise<unknown> };
};
const { ChatbotAllowedOriginModel } = require('../../src/api/v1/models/ChatbotAllowedOriginModel') as {
  ChatbotAllowedOriginModel: { findAll: (...args: unknown[]) => Promise<unknown> };
};
const { TagService } = require('../../src/api/v1/services/TagService') as {
  TagService: { classifyQuestion: (...args: unknown[]) => Promise<unknown> };
};
const { ChatRuntimeService } = require('../../src/api/v1/services/ChatRuntimeService') as {
  ChatRuntimeService: { fetchKnowledgeItems: (...args: unknown[]) => Promise<unknown> };
};
const { LLMService } = require('../../src/api/v1/services/LLMService') as {
  LLMService: { askGemini: (...args: unknown[]) => Promise<string> };
};

describe('POST /api/v1/public/chat origin hardening', () => {
  const originalFindOne = ChatbotModel.findOne;
  const originalFindAll = ChatbotAllowedOriginModel.findAll;
  const originalClassifyQuestion = TagService.classifyQuestion;
  const originalFetchKnowledgeItems = ChatRuntimeService.fetchKnowledgeItems;
  const originalAskGemini = LLMService.askGemini;

  afterAll(() => {
    ChatbotModel.findOne = originalFindOne;
    ChatbotAllowedOriginModel.findAll = originalFindAll;
    TagService.classifyQuestion = originalClassifyQuestion;
    ChatRuntimeService.fetchKnowledgeItems = originalFetchKnowledgeItems;
    LLMService.askGemini = originalAskGemini;
  });

  it('allows valid domain + allowed origin', async () => {
    ChatbotModel.findOne = jest
      .fn()
      .mockResolvedValue({ chatbot_id: 88, display_name: 'Shop Bot' } as never);
    ChatbotAllowedOriginModel.findAll = jest
      .fn()
      .mockResolvedValue([{ origin: 'https://shop.example.com' }] as never);
    TagService.classifyQuestion = jest.fn().mockResolvedValue(['CONTACT'] as never);
    ChatRuntimeService.fetchKnowledgeItems = jest.fn().mockResolvedValue([] as never);
    LLMService.askGemini = jest.fn().mockResolvedValue('ok');

    const response = await request(app)
      .post('/api/v1/public/chat')
      .set('Origin', 'https://shop.example.com')
      .send({ domain: 'shop.example.com', message: 'hello', widgetKey: 'widget_key_12345' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });


  it('allows any origin when wildcard allowlist entry exists', async () => {
    ChatbotModel.findOne = jest
      .fn()
      .mockResolvedValue({ chatbot_id: 88, display_name: 'Shop Bot' } as never);
    ChatbotAllowedOriginModel.findAll = jest.fn().mockResolvedValue([{ origin: '*' }] as never);
    TagService.classifyQuestion = jest.fn().mockResolvedValue(['CONTACT'] as never);
    ChatRuntimeService.fetchKnowledgeItems = jest.fn().mockResolvedValue([] as never);
    LLMService.askGemini = jest.fn().mockResolvedValue('ok');

    const response = await request(app)
      .post('/api/v1/public/chat')
      .set('Origin', 'https://preview.any-domain.example')
      .send({ domain: 'shop.example.com', message: 'hello' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('rejects disallowed origin with ORIGIN_NOT_ALLOWED', async () => {
    ChatbotModel.findOne = jest
      .fn()
      .mockResolvedValue({ chatbot_id: 90, display_name: 'Shop Bot' } as never);
    ChatbotAllowedOriginModel.findAll = jest
      .fn()
      .mockResolvedValue([{ origin: 'https://allowed.example.com' }] as never);

    const response = await request(app)
      .post('/api/v1/public/chat')
      .set('Origin', 'https://evil.example.com')
      .send({ domain: 'shop.example.com', message: 'hello' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  });
});
