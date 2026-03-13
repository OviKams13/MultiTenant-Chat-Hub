const test = require('node:test');
const assert = require('node:assert/strict');

// constantsPath targets the TypeScript config module executed through ts-node/register in test scripts.
const constantsPath = require.resolve('../../src/config/constants');

// withEnvSnapshot preserves process.env between tests so one case cannot leak config to another.
function withEnvSnapshot(run) {
  const snapshot = { ...process.env };
  return Promise.resolve()
    .then(run)
    .finally(() => {
      process.env = snapshot;
      delete require.cache[constantsPath];
    });
}

// This verifies the Gemini key is loaded exactly from environment values when present.
test('constants should expose GEMINI_API_KEY and GEMINI_MODEL_NAME when env key exists', async () => {
  await withEnvSnapshot(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    delete require.cache[constantsPath];

    const constants = require(constantsPath);
    assert.equal(constants.GEMINI_API_KEY, 'test-gemini-key');
    assert.equal(constants.GEMINI_MODEL_NAME, 'gemini-2.0-flash');
  });
});

// This enforces fail-fast startup behavior so backend never boots without mandatory Gemini credentials.
test('constants should throw when GEMINI_API_KEY is missing', async () => {
  await withEnvSnapshot(() => {
    delete process.env.GEMINI_API_KEY;
    delete require.cache[constantsPath];

    assert.throws(() => require(constantsPath), /GEMINI_API_KEY is required to start the application\./);
  });
});
