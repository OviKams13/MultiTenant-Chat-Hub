const test = require('node:test');
const assert = require('node:assert/strict');

const { AppError } = require('../../src/api/v1/errors/AppError');
const { ChatRuntimeService } = require('../../src/api/v1/services/ChatRuntimeService');
const { ChatbotModel } = require('../../src/api/v1/models/ChatbotModel');
const { TagService } = require('../../src/api/v1/services/TagService');

// withChatMocks isolates chat orchestration by patching chatbot resolution, classification, and context retrieval.
// This test focuses on the 8.4 + 8.5 integration contract, not on model-level SQL execution details.
async function withChatMocks(mocks, run) {
  const original = {
    findByPk: ChatbotModel.findByPk,
    classifyQuestion: TagService.classifyQuestion,
    fetchKnowledgeItems: ChatRuntimeService.fetchKnowledgeItems
  };

  if (mocks.findByPk) ChatbotModel.findByPk = mocks.findByPk;
  if (mocks.classifyQuestion) TagService.classifyQuestion = mocks.classifyQuestion;
  if (mocks.fetchKnowledgeItems) ChatRuntimeService.fetchKnowledgeItems = mocks.fetchKnowledgeItems;

  try {
    await run();
  } finally {
    ChatbotModel.findByPk = original.findByPk;
    TagService.classifyQuestion = original.classifyQuestion;
    ChatRuntimeService.fetchKnowledgeItems = original.fetchKnowledgeItems;
  }
}

test('ChatRuntimeService.chat should call fetchKnowledgeItems and map sourceItems from returned knowledge', async () => {
  await withChatMocks(
    {
      findByPk: async () => ({ chatbot_id: 2, display_name: 'Company Bot' }),
      classifyQuestion: async () => ['CONTACT', 'HOURS'],
      fetchKnowledgeItems: async (chatbotId, queryTags) => {
        assert.equal(chatbotId, 2);
        assert.deepEqual(queryTags, ['CONTACT', 'HOURS']);
        return [
          { kind: 'CONTACT', entityId: 10, createdAt: new Date(), contact: { org_name: 'Acme' } },
          { kind: 'SCHEDULE', entityId: 20, createdAt: new Date(), schedules: [] }
        ];
      }
    },
    async () => {
      const result = await ChatRuntimeService.chat({ chatbotId: 2, message: 'Where are you open?' });
      assert.equal(typeof result.answer, 'string');
      assert.equal(result.sourceItems.length, 2);
      assert.deepEqual(result.sourceItems.map((item) => item.entity_type), ['CONTACT', 'SCHEDULE']);
    }
  );
});

test('ChatRuntimeService.chat should throw NO_RELEVANT_TAG before fetchKnowledgeItems is called', async () => {
  await withChatMocks(
    {
      findByPk: async () => ({ chatbot_id: 2, display_name: 'Company Bot' }),
      classifyQuestion: async () => [],
      fetchKnowledgeItems: async () => {
        assert.fail('fetchKnowledgeItems should not run when classifyQuestion returns empty tags');
      }
    },
    async () => {
      try {
        await ChatRuntimeService.chat({ chatbotId: 2, message: 'Unrelated prompt' });
        assert.fail('Expected NO_RELEVANT_TAG AppError');
      } catch (error) {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'NO_RELEVANT_TAG');
      }
    }
  );
});
