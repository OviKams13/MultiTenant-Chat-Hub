import { MAX_CHAT_HISTORY_MESSAGES } from '../../../config/constants';
import { getGeminiModel } from '../../../config/geminiClient';
import { ChatRuntimeHistoryMessage, ChatRuntimeLLMParams } from '../interfaces/ChatRuntime';

type LLMErrorCode = 'TIMEOUT' | 'QUOTA_EXCEEDED' | 'UNAVAILABLE' | 'UNKNOWN';

// LLMError represents low-level errors when calling the Gemini API (timeouts, quota, etc.).
// This technical error is intentionally local to the LLM boundary and should be mapped by ChatRuntimeService.
// Keeping these codes explicit makes incident triage easier when admins report runtime answer failures.
// The controller layer never exposes these raw codes directly to public API consumers.
export class LLMError extends Error {
  code: LLMErrorCode;

  constructor(code: LLMErrorCode, message?: string) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

export class LLMService {
  // askGemini builds a strict system policy and sends tenant-scoped context to Gemini for final answer generation.
  // The method receives only sanitized runtime inputs (message/history/contextText) and never touches Express/DB objects.
  // Multi-tenant safety relies on ChatRuntimeService preparing contextText exclusively from the resolved chatbot scope.
  // If Gemini fails, the method normalizes SDK errors into LLMError so upper layers can return stable API errors.
  static async askGemini(params: ChatRuntimeLLMParams): Promise<string> {
    const {
      chatbotDisplayName,
      message,
      history,
      contextText,
      maxHistoryMessages = MAX_CHAT_HISTORY_MESSAGES,
      locale
    } = params;

    const trimmedHistory = this.trimHistory(history, maxHistoryMessages);
    const systemInstruction = this.buildSystemInstruction(chatbotDisplayName, locale);
    const contents = this.buildContents(trimmedHistory, contextText, message);

    try {
      const model = getGeminiModel();
      const result = await model.generateContent({
        // systemInstruction is passed to Gemini as a dedicated system-level instruction, not as a "user" message.
        systemInstruction: {
          // Gemini systemInstruction content should be provided as instruction parts (role omitted for compatibility).
          parts: [{ text: systemInstruction }]
        },
        contents
      });

      const answer = result.response?.text();
      if (typeof answer !== 'string' || answer.trim().length === 0) {
        throw new LLMError('UNKNOWN', 'Empty LLM response');
      }

      return answer;
    } catch (err: unknown) {
      if (err instanceof LLMError) {
        throw err;
      }

      // Map low-level Gemini errors to an internal LLMError with a high-level code.
      const mappedError = this.mapGeminiError(err);
      // Logging the mapped code helps operators diagnose why a tenant request returned LLM_UNAVAILABLE in production.
      console.error('[LLMService] Gemini request failed', {
        mappedCode: mappedError.code,
        originalMessage: err instanceof Error ? err.message : String(err)
      });
      throw mappedError;
    }
  }

  // trimHistory limits previous turns to reduce prompt size and avoid injecting too much untrusted conversation state.
  private static trimHistory(history: ChatRuntimeHistoryMessage[] | undefined, limit: number): ChatRuntimeHistoryMessage[] {
    if (!history || history.length === 0) {
      return [];
    }

    return history.slice(-Math.max(limit, 0));
  }

  // buildSystemInstruction defines strict tenant-aware behavior: answer only from provided context or admit uncertainty.
  private static buildSystemInstruction(chatbotDisplayName: string, locale?: string): string {
    const localeLine = locale
      ? `Adapte le ton de la réponse à la locale "${locale}" si possible, sans changer les règles.`
      : "Réponds en français clair et professionnel.";

    return [
      `Tu es un assistant pour le chatbot "${chatbotDisplayName}".`,
      'Tu dois répondre UNIQUEMENT en utilisant les informations fournies dans le contexte ci-dessous.',
      "Si la réponse n'est pas dans ce contexte, tu dis clairement que tu ne sais pas et que tu n'as pas assez d'informations.",
      "Si la question concerne un autre chatbot ou une autre entreprise, tu réponds que tu n'as pas d'informations à ce sujet.",
      "Tu ne dois jamais inventer d'informations ou utiliser des connaissances externes.",
      localeLine
    ].join(' ');
  }

  // buildContents converts chat history into Gemini roles and appends the current question with scoped chatbot context.
  private static buildContents(history: ChatRuntimeHistoryMessage[], contextText: string, message: string) {
    const contents = history.map((historyMessage) => ({
      role: historyMessage.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: historyMessage.content }]
    }));

    const finalUserText =
      "Voici des informations de contexte pour ce chatbot :\n\n" +
      contextText +
      "\n\nQuestion de l'utilisateur :\n" +
      message;

    contents.push({
      role: 'user',
      parts: [{ text: finalUserText }]
    });

    return contents;
  }

  // mapGeminiError translates SDK/network statuses into stable internal categories used by runtime orchestration.
  private static mapGeminiError(err: unknown): LLMError {
    const candidate = err as { status?: number | string; code?: number | string; message?: string };
    const status = String(candidate.status ?? candidate.code ?? '').toUpperCase();
    const message = String(candidate.message ?? '').toUpperCase();

    if (status.includes('DEADLINE_EXCEEDED') || status.includes('TIMEOUT') || message.includes('TIMEOUT')) {
      return new LLMError('TIMEOUT', 'LLM request timed out');
    }

    if (status.includes('RESOURCE_EXHAUSTED') || status.includes('429') || message.includes('QUOTA')) {
      return new LLMError('QUOTA_EXCEEDED', 'LLM quota exceeded');
    }

    if (status.includes('UNAVAILABLE') || status.includes('503') || message.includes('UNAVAILABLE')) {
      return new LLMError('UNAVAILABLE', 'LLM service unavailable');
    }

    return new LLMError('UNKNOWN', 'Unexpected LLM error');
  }
}
