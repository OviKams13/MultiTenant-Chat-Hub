const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const publicChatRoutes = require('../../src/api/v1/routes/publicChatRoutes').default;
const { errorHandler } = require('../../src/api/v1/middlewares/errorHandler');
const { ChatRuntimeService } = require('../../src/api/v1/services/ChatRuntimeService');
const { ChatbotModel } = require('../../src/api/v1/models/ChatbotModel');
const { LLMError, LLMService } = require('../../src/api/v1/services/LLMService');
const { TagService } = require('../../src/api/v1/services/TagService');

// createContractTestApp mounts only the public chat route stack so contract assertions stay focused and deterministic.
function createContractTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', publicChatRoutes);
  app.use(errorHandler);
  return app;
}

// startContractServer opens an ephemeral HTTP port used by integration tests without colliding with local dev server ports.
function startContractServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

// withContractRuntimeMocks isolates chat contract behavior by replacing DB/LLM dependencies with test doubles.
async function withContractRuntimeMocks(mocks, run) {
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

// postPublicChat sends a JSON request to the public chat endpoint and returns status + parsed contract body.
async function postPublicChat(port, payload) {
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

test('public chat contract should return success envelope with answer and sourceItems', async () => {
  await withContractRuntimeMocks(
    {
      findOne: async () => ({ chatbot_id: 31, display_name: 'Contract Bot' }),
      classifyQuestion: async () => ['CONTACT'],
      fetchKnowledgeItems: async () => [
        { kind: 'CONTACT', entityId: 700, createdAt: new Date('2026-01-01T00:00:00.000Z'), contact: { city: 'London' } }
      ],
      askGemini: async () => 'Contract answer'
    },
    async () => {
      const app = createContractTestApp();
      const { server, port } = await startContractServer(app);

      try {
        const result = await postPublicChat(port, { domain: 'contract.example.com', message: 'What is your address?' });
        assert.equal(result.status, 200);
        assert.equal(result.body.success, true);
        assert.equal(result.body.error, null);
        assert.equal(result.body.data.answer, 'Contract answer');
        assert.equal(Array.isArray(result.body.data.sourceItems), true);
      } finally {
        server.close();
      }
    }
  );
});

test('public chat contract should return NO_RELEVANT_TAG as error envelope', async () => {
  await withContractRuntimeMocks(
    {
      findOne: async () => ({ chatbot_id: 32, display_name: 'NoTag Bot' }),
      classifyQuestion: async () => []
    },
    async () => {
      const app = createContractTestApp();
      const { server, port } = await startContractServer(app);

      try {
        const result = await postPublicChat(port, { domain: 'notag.example.com', message: 'completely unknown intent' });
        assert.equal(result.status, 400);
        assert.equal(result.body.success, false);
        assert.equal(result.body.data, null);
        assert.equal(result.body.error.code, 'NO_RELEVANT_TAG');
      } finally {
        server.close();
      }
    }
  );
});

test('public chat contract should return CHATBOT_NOT_FOUND with 404', async () => {
  await withContractRuntimeMocks(
    {
      findOne: async () => null
    },
    async () => {
      const app = createContractTestApp();
      const { server, port } = await startContractServer(app);

      try {
        const result = await postPublicChat(port, { domain: 'missing.example.com', message: 'hello' });
        assert.equal(result.status, 404);
        assert.equal(result.body.success, false);
        assert.equal(result.body.data, null);
        assert.equal(result.body.error.code, 'CHATBOT_NOT_FOUND');
      } finally {
        server.close();
      }
    }
  );
});

test('public chat contract should return LLM_UNAVAILABLE with 503', async () => {
  await withContractRuntimeMocks(
    {
      findOne: async () => ({ chatbot_id: 33, display_name: 'Down Bot' }),
      classifyQuestion: async () => ['CONTACT'],
      fetchKnowledgeItems: async () => [
        { kind: 'CONTACT', entityId: 701, createdAt: new Date('2026-01-01T00:00:00.000Z'), contact: { city: 'Berlin' } }
      ],
      askGemini: async () => {
        throw new LLMError('TIMEOUT', 'Simulated timeout');
      }
    },
    async () => {
      const app = createContractTestApp();
      const { server, port } = await startContractServer(app);

      try {
        const result = await postPublicChat(port, { domain: 'down.example.com', message: 'hello' });
        assert.equal(result.status, 503);
        assert.equal(result.body.success, false);
        assert.equal(result.body.data, null);
        assert.equal(result.body.error.code, 'LLM_UNAVAILABLE');
        assert.equal(result.body.error.message, 'The answer generation service is temporarily unavailable.');
      } finally {
        server.close();
      }
    }
  );
});

test('public chat contract should return validation error envelope for invalid body', async () => {
  const app = createContractTestApp();
  const { server, port } = await startContractServer(app);

  try {
    const result = await postPublicChat(port, { message: '' });
    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
    assert.equal(result.body.data, null);
    assert.equal(result.body.error.code, 'VALIDATION_ERROR');
  } finally {
    server.close();
  }
});
