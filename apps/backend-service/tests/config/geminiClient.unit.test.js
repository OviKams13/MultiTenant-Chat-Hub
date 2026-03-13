const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const constantsPath = require.resolve('../../src/config/constants');
const clientPath = require.resolve('../../src/config/geminiClient');

// withPatchedModuleLoad intercepts SDK import so tests stay offline and deterministic.
async function withPatchedModuleLoad(factory, run) {
  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === '@google/generative-ai') {
      return factory();
    }

    return originalLoad(request, parent, isMain);
  };

  try {
    await run();
  } finally {
    Module._load = originalLoad;
  }
}

// resetRuntimeModules clears cached config/client modules so each test runs with fresh env + mocks.
function resetRuntimeModules() {
  delete require.cache[constantsPath];
  delete require.cache[clientPath];
}

// This validates that geminiClient wires API key + model name into the official SDK constructor methods.
test('getGeminiModel should instantiate SDK with GEMINI_API_KEY and request GEMINI_MODEL_NAME', async () => {
  const calls = { constructorArg: null, modelArg: null };

  await withPatchedModuleLoad(
    () => ({
      GoogleGenerativeAI: class MockGoogleGenerativeAI {
        constructor(apiKey) {
          calls.constructorArg = apiKey;
        }

        getGenerativeModel(config) {
          calls.modelArg = config;
          return { mock: 'gemini-model' };
        }
      }
    }),
    async () => {
      process.env.GEMINI_API_KEY = 'gemini-key-from-test';
      resetRuntimeModules();

      const { getGeminiModel } = require(clientPath);
      const model = getGeminiModel();

      assert.deepEqual(model, { mock: 'gemini-model' });
      assert.equal(calls.constructorArg, 'gemini-key-from-test');
      assert.deepEqual(calls.modelArg, { model: 'gemini-2.0-flash' });
    }
  );
});
