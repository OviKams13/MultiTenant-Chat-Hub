// Runtime constants centralize guardrails shared by public chat orchestration steps.
// Keeping limits in one place avoids hidden magic numbers across service methods.
// Feature 8.6 introduces context window trimming before LLM invocation.
// This value can be tuned per deployment once prompt/token budgets are measured in production.
export const MAX_CONTEXT_ITEMS = 5;
