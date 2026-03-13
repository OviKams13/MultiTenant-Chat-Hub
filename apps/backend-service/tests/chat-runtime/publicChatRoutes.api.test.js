const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const publicChatRoutes = require('../../src/api/v1/routes/publicChatRoutes').default;
const { errorHandler } = require('../../src/api/v1/middlewares/errorHandler');

// createTestApp wires the same middleware order used in production for /public/chat.
// We expose only the relevant route so integration checks stay focused on feature 8.2 behavior.
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', publicChatRoutes);
  app.use(errorHandler);
  return app;
}

// startServer launches an ephemeral HTTP server so tests can call the real Express pipeline.
// Using a random port keeps tests isolated and safe for concurrent local runs.
function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

// postJson is a tiny request helper for JSON-based route tests.
// It mirrors Postman behavior and returns both status and parsed body for assertions.
async function postJson(port, payload) {
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/public/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  return { status: response.status, body };
}

test('POST /api/v1/public/chat should return 400 when message is missing', async () => {
  const app = createTestApp();
  const { server, port } = await startServer(app);

  try {
    const result = await postJson(port, { domain: 'acme.com' });
    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
    assert.equal(result.body.error.code, 'VALIDATION_ERROR');
  } finally {
    server.close();
  }
});

test('POST /api/v1/public/chat should return 400 when both chatbotId and domain are missing', async () => {
  const app = createTestApp();
  const { server, port } = await startServer(app);

  try {
    const result = await postJson(port, { message: 'hello' });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, 'VALIDATION_ERROR');
  } finally {
    server.close();
  }
});

test('POST /api/v1/public/chat should pass validation for a minimal valid body', async () => {
  const app = createTestApp();
  const { server, port } = await startServer(app);

  try {
    const result = await postJson(port, { domain: 'acme.com', message: 'hello' });
    assert.notEqual(result.status, 400);
  } finally {
    server.close();
  }
});
