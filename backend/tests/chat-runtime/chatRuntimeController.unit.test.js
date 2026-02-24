const test = require('node:test');
const assert = require('node:assert/strict');

const { AppError } = require('../../src/api/v1/errors/AppError');
const { ChatRuntimeController } = require('../../src/api/v1/controllers/ChatRuntimeController');
const { ChatRuntimeService } = require('../../src/api/v1/services/ChatRuntimeService');

// createMockResponse emulates Express response chaining so controller tests stay framework-light.
// We only implement methods used by the controller (status + json), keeping assertions focused.
function createMockResponse() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

// createValidRequest returns a normalized payload matching feature 8.2 output contract.
// Controller tests consume this payload to verify pass-through into service layer input.
function createValidRequest() {
  return {
    body: {
      chatbotId: 3,
      domain: 'acme.com',
      message: 'What is your address?',
      history: [{ role: 'user', content: 'hello' }]
    }
  };
}

test('ChatRuntimeController.handleChat should call service and return success envelope', async () => {
  const req = createValidRequest();
  const res = createMockResponse();
  const nextCalls = [];

  const original = ChatRuntimeService.chat;
  ChatRuntimeService.chat = async (input) => {
    assert.deepEqual(input, req.body);
    return {
      answer: 'Test answer',
      sourceItems: [{ entity_id: 10, entity_type: 'CONTACT', tags: ['CONTACT'] }]
    };
  };

  try {
    await ChatRuntimeController.handleChat(req, res, (err) => nextCalls.push(err));

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.payload, {
      success: true,
      data: {
        answer: 'Test answer',
        sourceItems: [{ entity_id: 10, entity_type: 'CONTACT', tags: ['CONTACT'] }]
      },
      error: null
    });
    assert.equal(nextCalls.length, 0);
  } finally {
    ChatRuntimeService.chat = original;
  }
});

test('ChatRuntimeController.handleChat should forward service errors to next', async () => {
  const req = createValidRequest();
  const res = createMockResponse();
  let capturedError = null;

  const original = ChatRuntimeService.chat;
  const expectedError = new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND');
  ChatRuntimeService.chat = async () => {
    throw expectedError;
  };

  try {
    await ChatRuntimeController.handleChat(req, res, (err) => {
      capturedError = err;
    });

    assert.equal(capturedError, expectedError);
    assert.equal(res.statusCode, null);
    assert.equal(res.payload, null);
  } finally {
    ChatRuntimeService.chat = original;
  }
});
