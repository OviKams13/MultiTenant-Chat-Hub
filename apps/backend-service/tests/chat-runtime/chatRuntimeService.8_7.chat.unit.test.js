const test = require('node:test');
const assert = require('node:assert/strict');

const { AppError } = require('../../src/api/v1/errors/AppError');
const { ChatRuntimeService } = require('../../src/api/v1/services/ChatRuntimeService');
const { ChatbotModel } = require('../../src/api/v1/models/ChatbotModel');
const { LLMError, LLMService } = require('../../src/api/v1/services/LLMService');
const { TagService } = require('../../src/api/v1/services/TagService');

// withRuntimeMocks patches orchestration dependencies so we can focus only on Feature 8.7 LLM integration behavior.
// This avoids database coupling and validates the service contract used by the public chat controller.
async function withRuntimeMocks(mocks, run) {
  const original = {
    findByPk: ChatbotModel.findByPk,
    classifyQuestion: TagService.classifyQuestion,
    fetchKnowledgeItems: ChatRuntimeService.fetchKnowledgeItems,
    askGemini: LLMService.askGemini
  };

  if (mocks.findByPk) ChatbotModel.findByPk = mocks.findByPk;
  if (mocks.classifyQuestion) TagService.classifyQuestion = mocks.classifyQuestion;
  if (mocks.fetchKnowledgeItems) ChatRuntimeService.fetchKnowledgeItems = mocks.fetchKnowledgeItems;
  if (mocks.askGemini) LLMService.askGemini = mocks.askGemini;

  try {
    await run();
  } finally {
    ChatbotModel.findByPk = original.findByPk;
    TagService.classifyQuestion = original.classifyQuestion;
    ChatRuntimeService.fetchKnowledgeItems = original.fetchKnowledgeItems;
    LLMService.askGemini = original.askGemini;
  }
}

test('ChatRuntimeService.chat should call LLMService.askGemini with resolved displayName and contextText', async () => {
  let capturedLLMParams;

  await withRuntimeMocks(
    {
      findByPk: async () => ({ chatbot_id: 7, display_name: 'Tenant Bot' }),
      classifyQuestion: async () => ['CONTACT'],
      fetchKnowledgeItems: async () => [
        { kind: 'CONTACT', entityId: 101, createdAt: new Date('2026-01-01T00:00:00.000Z'), contact: { org_name: 'Acme' } }
      ],
      askGemini: async (params) => {
        capturedLLMParams = params;
        return 'Réponse test';
      }
    },
    async () => {
      const result = await ChatRuntimeService.chat({
        chatbotId: 7,
        message: 'Quelle est votre adresse ?',
        history: [{ role: 'user', content: 'Bonjour' }]
      });

      assert.equal(result.answer, 'Réponse test');
      assert.equal(result.sourceItems.length, 1);
      assert.equal(result.sourceItems[0].entity_type, 'CONTACT');
    }
  );

  assert.equal(capturedLLMParams.chatbotDisplayName, 'Tenant Bot');
  assert.equal(capturedLLMParams.message, 'Quelle est votre adresse ?');
  assert.equal(capturedLLMParams.history.length, 1);
  assert.ok(capturedLLMParams.contextText.includes('CONTACT (entityId=101):'));
});

test('ChatRuntimeService.chat should map LLMError into AppError LLM_UNAVAILABLE', async () => {
  await withRuntimeMocks(
    {
      findByPk: async () => ({ chatbot_id: 3, display_name: 'Downtime Bot' }),
      classifyQuestion: async () => ['CONTACT'],
      fetchKnowledgeItems: async () => [
        { kind: 'CONTACT', entityId: 12, createdAt: new Date('2026-01-01T00:00:00.000Z'), contact: { org_name: 'Acme' } }
      ],
      askGemini: async () => {
        throw new LLMError('TIMEOUT', 'timeout');
      }
    },
    async () => {
      await assert.rejects(() => ChatRuntimeService.chat({ chatbotId: 3, message: 'Test' }), (error) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'LLM_UNAVAILABLE');
        assert.equal(error.statusCode, 503);
        return true;
      });
    }
  );
});
