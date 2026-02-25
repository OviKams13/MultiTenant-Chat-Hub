const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const publicChatRoutes = require('../../src/api/v1/routes/publicChatRoutes').default;
const { errorHandler } = require('../../src/api/v1/middlewares/errorHandler');
const { ChatRuntimeService } = require('../../src/api/v1/services/ChatRuntimeService');
const { ChatbotModel } = require('../../src/api/v1/models/ChatbotModel');
const { LLMError, LLMService } = require('../../src/api/v1/services/LLMService');
const { TagService } = require('../../src/api/v1/services/TagService');

// createChatApp mounts only the public chat route and global error handler to validate HTTP contract stability.
function createChatApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', publicChatRoutes);
  app.use(errorHandler);
  return app;
}

// startServer spins up an ephemeral server so we can assert real status codes and JSON envelopes.
function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

// withApiRuntimeMocks stubs tenant resolution, tag classification, context retrieval, and LLM call for integration tests.
async function withApiRuntimeMocks(mocks, run) {
  const original = {
    findOne: ChatbotModel.findOne,
    classifyQuestion: TagService.classifyQuestion,
    fetchKnowledgeItems: ChatRuntimeService.fetchKnowledgeItems,
    askGemini: LLMService.askGemini
  };

  if (mocks.findOne) ChatbotModel.findOne = mocks.findOne;
  if (mocks.classifyQuestion) TagService.classifyQuestion = mocks.classifyQuestion;
  if (mocks.fetchKnowledgeItems) ChatRuntimeService.fetchKnowledgeItems = mocks.fetchKnowledgeItems;
  if (mocks.askGemini) LLMService.askGemini = mocks.askGemini;

  try {
    await run();
  } finally {
    ChatbotModel.findOne = original.findOne;
    TagService.classifyQuestion = original.classifyQuestion;
    ChatRuntimeService.fetchKnowledgeItems = original.fetchKnowledgeItems;
    LLMService.askGemini = original.askGemini;
  }
}

async function postChat(port, payload) {
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/public/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

test('POST /api/v1/public/chat should return 200 with LLM answer when Gemini is available', async () => {
  await withApiRuntimeMocks(
    {
      findOne: async () => ({ chatbot_id: 14, display_name: 'Tenant Domain Bot' }),
      classifyQuestion: async () => ['CONTACT'],
      fetchKnowledgeItems: async () => [
        { kind: 'CONTACT', entityId: 201, createdAt: new Date('2026-01-01T00:00:00.000Z'), contact: { city: 'Paris' } }
      ],
      askGemini: async () => 'Réponse API test'
    },
    async () => {
      const app = createChatApp();
      const { server, port } = await startServer(app);

      try {
        const result = await postChat(port, { domain: 'tenant.example.com', message: 'Où êtes-vous ?' });
        assert.equal(result.status, 200);
        assert.equal(result.body.success, true);
        assert.equal(result.body.error, null);
        assert.equal(result.body.data.answer, 'Réponse API test');
      } finally {
        server.close();
      }
    }
  );
});

test('POST /api/v1/public/chat should return 503 and LLM_UNAVAILABLE when Gemini fails', async () => {
  await withApiRuntimeMocks(
    {
      findOne: async () => ({ chatbot_id: 22, display_name: 'Offline Bot' }),
      classifyQuestion: async () => ['CONTACT'],
      fetchKnowledgeItems: async () => [
        { kind: 'CONTACT', entityId: 202, createdAt: new Date('2026-01-01T00:00:00.000Z'), contact: { city: 'Lyon' } }
      ],
      askGemini: async () => {
        throw new LLMError('UNAVAILABLE', 'Gemini down');
      }
    },
    async () => {
      const app = createChatApp();
      const { server, port } = await startServer(app);

      try {
        const result = await postChat(port, { domain: 'tenant.example.com', message: 'Adresse ?' });
        assert.equal(result.status, 503);
        assert.equal(result.body.success, false);
        assert.equal(result.body.data, null);
        assert.equal(result.body.error.code, 'LLM_UNAVAILABLE');
      } finally {
        server.close();
      }
    }
  );
});
