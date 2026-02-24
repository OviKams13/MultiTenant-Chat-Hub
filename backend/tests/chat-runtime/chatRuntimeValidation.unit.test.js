const test = require('node:test');
const assert = require('node:assert/strict');

const { AppError } = require('../../src/api/v1/errors/AppError');
const {
  validateChatRuntimeBody,
  MAX_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_HISTORY_CONTENT_LENGTH
} = require('../../src/api/v1/validations/chatRuntimeValidation');

// captureValidationError centralizes assertions for invalid payload paths.
// We enforce AppError shape because API error envelopes depend on status/code semantics.
function captureValidationError(payload) {
  try {
    validateChatRuntimeBody(payload);
    assert.fail('Expected validation to throw');
  } catch (error) {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 400);
    assert.equal(error.code, 'VALIDATION_ERROR');
    return error;
  }
}

// hasIssue makes error detail checks readable across many field-level scenarios.
// Validation returns an array of structured issues so tests can assert precise failures.
function hasIssue(error, field, issue) {
  const details = error.details?.errors ?? [];
  return details.some((item) => item.field === field && item.issue === issue);
}

test('validateChatRuntimeBody should reject missing message', () => {
  const error = captureValidationError({ domain: 'acme.com' });
  assert.equal(hasIssue(error, 'message', 'REQUIRED'), true);
});

test('validateChatRuntimeBody should reject empty message and too long message', () => {
  const emptyError = captureValidationError({ domain: 'acme.com', message: '   ' });
  assert.equal(hasIssue(emptyError, 'message', 'EMPTY'), true);

  const longMessage = 'x'.repeat(MAX_MESSAGE_LENGTH + 1);
  const tooLongError = captureValidationError({ domain: 'acme.com', message: longMessage });
  assert.equal(hasIssue(tooLongError, 'message', 'TOO_LONG'), true);
});

test('validateChatRuntimeBody should require at least one identifier', () => {
  const error = captureValidationError({ message: 'Hello' });
  assert.equal(hasIssue(error, 'chatbotId|domain', 'ONE_REQUIRED'), true);
});

test('validateChatRuntimeBody should reject invalid chatbotId values', () => {
  const badType = captureValidationError({ chatbotId: '1', message: 'Hello' });
  assert.equal(hasIssue(badType, 'chatbotId', 'INVALID_TYPE'), true);

  const badValue = captureValidationError({ chatbotId: 0, message: 'Hello' });
  assert.equal(hasIssue(badValue, 'chatbotId', 'INVALID_VALUE'), true);
});

test('validateChatRuntimeBody should reject invalid domain values', () => {
  const empty = captureValidationError({ domain: '   ', message: 'Hello' });
  assert.equal(hasIssue(empty, 'domain', 'EMPTY'), true);

  const long = captureValidationError({ domain: `${'a'.repeat(256)}.com`, message: 'Hello' });
  assert.equal(hasIssue(long, 'domain', 'TOO_LONG'), true);
});

test('validateChatRuntimeBody should reject malformed history payloads', () => {
  const notArray = captureValidationError({ domain: 'acme.com', message: 'Hello', history: {} });
  assert.equal(hasIssue(notArray, 'history', 'INVALID_TYPE'), true);

  const oversized = captureValidationError({
    domain: 'acme.com',
    message: 'Hello',
    history: Array.from({ length: MAX_HISTORY_MESSAGES + 1 }, () => ({ role: 'user', content: 'x' }))
  });
  assert.equal(hasIssue(oversized, 'history', 'TOO_MANY_MESSAGES'), true);

  const badRole = captureValidationError({
    domain: 'acme.com',
    message: 'Hello',
    history: [{ role: 'system', content: 'x' }]
  });
  assert.equal(hasIssue(badRole, 'history.role', 'INVALID_ROLE'), true);

  const longContent = captureValidationError({
    domain: 'acme.com',
    message: 'Hello',
    history: [{ role: 'user', content: 'x'.repeat(MAX_HISTORY_CONTENT_LENGTH + 1) }]
  });
  assert.equal(hasIssue(longContent, 'history.content', 'TOO_LONG'), true);
});

test('validateChatRuntimeBody should accept valid domain-only payload', () => {
  const result = validateChatRuntimeBody({ domain: 'Acme.Com', message: '  Hello  ' });
  assert.deepEqual(result, { domain: 'acme.com', message: 'Hello', chatbotId: undefined, history: undefined });
});

test('validateChatRuntimeBody should accept valid chatbotId with normalized history', () => {
  const result = validateChatRuntimeBody({
    chatbotId: 42,
    message: 'Need help',
    history: [
      { role: 'user', content: '   hi ' },
      { role: 'assistant', content: ' hello ' }
    ]
  });

  assert.equal(result.chatbotId, 42);
  assert.equal(result.domain, undefined);
  assert.equal(result.history.length, 2);
  assert.deepEqual(result.history[0], { role: 'user', content: 'hi' });
});
