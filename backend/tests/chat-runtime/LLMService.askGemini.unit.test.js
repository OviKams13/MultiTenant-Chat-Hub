const test = require('node:test');
const assert = require('node:assert/strict');

const geminiClient = require('../../src/config/geminiClient');
const constants = require('../../src/config/constants');
const { LLMError, LLMService } = require('../../src/api/v1/services/LLMService');

// withMockedModel swaps getGeminiModel so tests can validate payload building without real network calls to Gemini.
// This is important for CI stability and for proving tenant prompt composition logic in strict unit boundaries.
async function withMockedModel(generateContentImpl, run) {
  const originalGetGeminiModel = geminiClient.getGeminiModel;
  geminiClient.getGeminiModel = () => ({ generateContent: generateContentImpl });

  try {
    await run();
  } finally {
    geminiClient.getGeminiModel = originalGetGeminiModel;
  }
}

// createBaseParams returns a canonical runtime payload similar to what a public visitor sends to one chatbot tenant.
function createBaseParams() {
  return {
    chatbotDisplayName: 'Chatbot A',
    message: 'Quels sont vos horaires ?',
    history: [
      { role: 'user', content: 'Bonjour' },
      { role: 'assistant', content: 'Bonjour, comment puis-je vous aider ?' }
    ],
    contextText: 'SCHEDULE (entityId=1): day: MONDAY, open: 09:00, close: 18:00'
  };
}

test('LLMService.askGemini should return text answer and include system instruction + context payload', async () => {
  let capturedPayload;

  await withMockedModel(
    async (payload) => {
      capturedPayload = payload;
      return { response: { text: () => 'Réponse test' } };
    },
    async () => {
      const answer = await LLMService.askGemini(createBaseParams());
      assert.equal(answer, 'Réponse test');
    }
  );

  assert.ok(capturedPayload.systemInstruction.parts[0].text.includes('Chatbot A'));
  assert.equal(typeof capturedPayload.systemInstruction.role, 'undefined');
  assert.ok(capturedPayload.contents[capturedPayload.contents.length - 1].parts[0].text.includes('Question de l\'utilisateur'));
  assert.ok(capturedPayload.contents[capturedPayload.contents.length - 1].parts[0].text.includes('SCHEDULE (entityId=1)'));
});

test('LLMService.askGemini should trim history to MAX_CHAT_HISTORY_MESSAGES', async () => {
  let capturedPayload;
  const longHistory = Array.from({ length: constants.MAX_CHAT_HISTORY_MESSAGES + 3 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `msg-${index + 1}`
  }));

  await withMockedModel(
    async (payload) => {
      capturedPayload = payload;
      return { response: { text: () => 'Réponse tronquée' } };
    },
    async () => {
      await LLMService.askGemini({ ...createBaseParams(), history: longHistory });
    }
  );

  // contents = trimmed history + final user message that carries context and current question.
  assert.equal(capturedPayload.contents.length, constants.MAX_CHAT_HISTORY_MESSAGES + 1);
  assert.equal(capturedPayload.contents[0].parts[0].text, `msg-${longHistory.length - constants.MAX_CHAT_HISTORY_MESSAGES + 1}`);
});

test('LLMService.askGemini should throw LLMError UNKNOWN when Gemini response is empty', async () => {
  await withMockedModel(
    async () => ({ response: { text: () => '' } }),
    async () => {
      await assert.rejects(() => LLMService.askGemini(createBaseParams()), (error) => {
        assert.ok(error instanceof LLMError);
        assert.equal(error.code, 'UNKNOWN');
        return true;
      });
    }
  );
});

test('LLMService.askGemini should map timeout, quota, and unavailable errors', async () => {
  await withMockedModel(
    async () => {
      throw { code: 'DEADLINE_EXCEEDED' };
    },
    async () => {
      await assert.rejects(() => LLMService.askGemini(createBaseParams()), (error) => {
        assert.equal(error.code, 'TIMEOUT');
        return true;
      });
    }
  );

  await withMockedModel(
    async () => {
      throw { status: 429 };
    },
    async () => {
      await assert.rejects(() => LLMService.askGemini(createBaseParams()), (error) => {
        assert.equal(error.code, 'QUOTA_EXCEEDED');
        return true;
      });
    }
  );

  await withMockedModel(
    async () => {
      throw { status: 503 };
    },
    async () => {
      await assert.rejects(() => LLMService.askGemini(createBaseParams()), (error) => {
        assert.equal(error.code, 'UNAVAILABLE');
        return true;
      });
    }
  );
});
