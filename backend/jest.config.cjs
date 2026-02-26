/**
 * Jest config dedicated to Feature 8.9 test suites.
 * We transpile TypeScript tests with ts-jest and keep execution in Node environment.
 * The match list is explicit to avoid changing legacy node:test suites already present in the repository.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/src/api/v1/tests/chat-runtime/ChatRuntimeService.test.ts', '**/tests/chat-runtime/publicChat.api.test.ts'],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }]
  }
};
