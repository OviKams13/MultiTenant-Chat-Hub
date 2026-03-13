import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY, GEMINI_MODEL_NAME } from './constants';

// Shared Gemini client instance configured with the API key.
// This backend singleton avoids re-initializing SDK clients on every chat request.
// Never expose GEMINI_API_KEY to the frontend. All Gemini calls must go through this backend client.
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Helper to get the configured generative model (e.g. gemini-2.0-flash).
// LLMService will use this client and handle all Gemini-related errors and timeouts.
// Feature 8.7 will call this function before invoking generateContent with runtime context text.
export function getGeminiModel() {
  return genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
}
