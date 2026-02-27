import { MAX_CHAT_HISTORY_MESSAGES } from '../../../config/constants';
import { getGeminiModel } from '../../../config/geminiClient';
import { ChatRuntimeHistoryMessage, ChatRuntimeLLMParams } from '../interfaces/ChatRuntime';

type LLMErrorCode = 'TIMEOUT' | 'QUOTA_EXCEEDED' | 'UNAVAILABLE' | 'UNKNOWN';

// LLMError represents low-level failures while calling Gemini (timeouts, quota, transport, provider outages).
// This class is intentionally technical and should be translated to AppError by ChatRuntimeService.
// Keeping explicit codes helps operations identify whether issues come from quota, availability, or unknown failures.
// Controllers and clients should never depend on these internal LLM codes directly.
export class LLMError extends Error {
  code: LLMErrorCode;

  constructor(code: LLMErrorCode, message?: string) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

export class LLMService {
  // askGemini builds the prompt payload for one tenant chatbot and executes the Gemini request.
  // It uses only sanitized runtime inputs (message/history/context) and avoids any database/framework dependency.
  // The function enforces deterministic prompt policy so responses stay grounded in tenant-provided context.
  // On provider failure, this method normalizes errors into LLMError so upper layers can return stable API contracts.
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
        // systemInstruction is sent through the dedicated instruction channel (not mixed with user messages).
        systemInstruction: {
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

      // Map low-level Gemini errors to an internal LLMError with a high-level code used by chat runtime mapping.
      const mappedError = this.mapGeminiError(err);
      // Operational log helps administrators correlate API 503 responses with upstream quota/availability root causes.
      console.error('[LLMService] Gemini request failed', {
        mappedCode: mappedError.code,
        originalMessage: err instanceof Error ? err.message : String(err)
      });
      throw mappedError;
    }
  }

  // trimHistory limits prior turns to protect token budget, latency, and prompt-injection surface area.
  private static trimHistory(history: ChatRuntimeHistoryMessage[] | undefined, limit: number): ChatRuntimeHistoryMessage[] {
    if (!history || history.length === 0) {
      return [];
    }

    return history.slice(-Math.max(limit, 0));
  }

  // buildSystemInstruction sets strict policy: use only context, avoid hallucinations, and answer in English.
  // Locale is optional, but English remains the default product language for this runtime experience.
  private static buildSystemInstruction(chatbotDisplayName: string, locale?: string): string {
    const localeLine = locale
      ? `Prefer responses in locale "${locale}" only when it does not conflict with the strict grounding rules.`
      : 'Respond in clear professional English.';

    return [
      `You are an assistant for the chatbot "${chatbotDisplayName}".`,
      'You must answer using ONLY the information provided in the context below.',
      'If the answer is not present in the context, clearly say that you do not know and do not have enough information.',
      'If the user asks about another chatbot or another company, say you do not have information about that.',
      'Never invent facts and never use external knowledge outside the provided context.',
      'Always keep the response in English.',
      localeLine
    ].join(' ');
  }

  // buildContents maps validated conversation history to Gemini roles and appends the final grounded user question.
  // Context and question are merged in one final user turn so the model receives tenant scope right before generation.
  private static buildContents(history: ChatRuntimeHistoryMessage[], contextText: string, message: string) {
    const contents = history.map((historyMessage) => ({
      role: historyMessage.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: historyMessage.content }]
    }));

    const finalUserText =
      'Here is the tenant chatbot context:\n\n' + contextText + '\n\nCurrent user question:\n' + message;

    contents.push({
      role: 'user',
      parts: [{ text: finalUserText }]
    });

    return contents;
  }

  // mapGeminiError translates provider/network status signals into stable internal LLM error categories.
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
