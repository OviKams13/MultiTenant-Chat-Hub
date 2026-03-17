/**
 * Jest config for backend TypeScript suites.
 * We transpile TypeScript tests with ts-jest and keep execution in Node environment.
 * Legacy node:test JS suites remain executable with `node --test` where needed.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/src/api/v1/tests/chat-runtime/ChatRuntimeService.test.ts',
    '**/src/api/v1/tests/chatbots/ChatbotAllowedOriginService.test.ts',
    '**/src/api/v1/tests/chat-runtime/PublicRuntimeSecurityService.test.ts',
    '**/tests/chat-runtime/publicChat.api.test.ts',
    '**/tests/chat-runtime/publicChat.security.api.test.ts',
    '**/tests/service-boundary/backendPackaging.api.test.ts'
  ],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }]
  }
};
