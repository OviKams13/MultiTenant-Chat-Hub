const test = require('node:test');
const assert = require('node:assert/strict');

const { AppError } = require('../../src/api/v1/errors/AppError');
const { ChatRuntimeService } = require('../../src/api/v1/services/ChatRuntimeService');
const { ChatbotModel } = require('../../src/api/v1/models/ChatbotModel');
const { TagService } = require('../../src/api/v1/services/TagService');

// withMocks patches model/service methods for one test block and restores them afterward.
// This pattern keeps feature 8.4 tests focused on runtime branching logic instead of database behavior.
async function withMocks(mocks, run) {
  const original = {
    findByPk: ChatbotModel.findByPk,
    findOne: ChatbotModel.findOne,
    classifyQuestion: TagService.classifyQuestion
  };

  if (mocks.findByPk) ChatbotModel.findByPk = mocks.findByPk;
  if (mocks.findOne) ChatbotModel.findOne = mocks.findOne;
  if (mocks.classifyQuestion) TagService.classifyQuestion = mocks.classifyQuestion;

  try {
    await run();
  } finally {
    ChatbotModel.findByPk = original.findByPk;
    ChatbotModel.findOne = original.findOne;
    TagService.classifyQuestion = original.classifyQuestion;
  }
}

// expectAppError ensures service failures keep machine-readable status/code contracts.
// Runtime controller and global error handler rely on these values for consistent API output.
async function expectAppError(promiseFactory, expectedCode) {
  try {
    await promiseFactory();
    assert.fail('Expected AppError to be thrown');
  } catch (error) {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, expectedCode);
  }
}

test('ChatRuntimeService.chat should resolve chatbot by chatbotId and return placeholder result', async () => {
  await withMocks(
    {
      findByPk: async () => ({ chatbot_id: 9, display_name: 'MallBot' }),
      classifyQuestion: async () => ['CONTACT']
    },
    async () => {
      const result = await ChatRuntimeService.chat({ chatbotId: 9, message: 'where are you?' });
      assert.equal(typeof result.answer, 'string');
      assert.deepEqual(result.sourceItems, []);
    }
  );
});

test('ChatRuntimeService.chat should resolve chatbot by domain when chatbotId is absent', async () => {
  await withMocks(
    {
      findOne: async ({ where }) => {
        assert.equal(where.domain, 'acme.com');
        return { chatbot_id: 7, display_name: 'Acme Assistant' };
      },
      classifyQuestion: async () => ['HOURS']
    },
    async () => {
      const result = await ChatRuntimeService.chat({ domain: 'acme.com', message: 'opening hours?' });
      assert.equal(typeof result.answer, 'string');
      assert.deepEqual(result.sourceItems, []);
    }
  );
});

test('ChatRuntimeService.chat should throw CHATBOT_NOT_FOUND when chatbot cannot be resolved', async () => {
  await withMocks(
    {
      findByPk: async () => null
    },
    async () => {
      await expectAppError(() => ChatRuntimeService.chat({ chatbotId: 999, message: 'hello' }), 'CHATBOT_NOT_FOUND');
    }
  );
});

test('ChatRuntimeService.chat should throw NO_RELEVANT_TAG when classification returns empty list', async () => {
  await withMocks(
    {
      findByPk: async () => ({ chatbot_id: 12, display_name: 'Test Bot' }),
      classifyQuestion: async () => []
    },
    async () => {
      await expectAppError(() => ChatRuntimeService.chat({ chatbotId: 12, message: 'unknown intent' }), 'NO_RELEVANT_TAG');
    }
  );
});
