// Runtime constants centralize guardrails shared by public chat orchestration steps.
// Keeping limits in one place avoids hidden magic numbers across service methods.
// Feature 8.6 introduces context window trimming before LLM invocation.
// This value can be tuned per deployment once prompt/token budgets are measured in production.
export const MAX_CONTEXT_ITEMS = 5;

// Gemini API key loaded from environment variables.
// This secret must stay backend-only and must never be exposed to frontend bundles.
// Do not log this value and do not commit .env files to source control.
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Default Gemini model used by the LLMService.
// Feature 8.7 will consume this model name through geminiClient for real inference calls.
export const GEMINI_MODEL_NAME = 'gemini-2.0-flash';

// Fail fast if GEMINI_API_KEY is not provided.
// We stop application startup early so production never runs with partially configured LLM infrastructure.
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required to start the application.');
}
