import { AppError } from '../errors/AppError';
import { ChatRuntimeInput, ChatRuntimeResult } from '../interfaces/ChatRuntime';
import { ChatbotModel } from '../models/ChatbotModel';
import { TagService } from './TagService';

interface ResolvedChatbotContext {
  chatbotId: number;
  displayName: string;
}

// ChatRuntimeService owns public-chat business orchestration and keeps controllers free from domain logic.
// Feature 8.4 intentionally covers only chatbot resolution and message-to-tag classification steps.
// Data retrieval and LLM response generation are deferred to features 8.5–8.7 and are documented as TODOs.
// Multi-tenant safety starts here: once chatbot is resolved, all later queries must remain scoped to chatbotId.
export class ChatRuntimeService {
  // chat is the main runtime entrypoint called by the public controller for every visitor question.
  // It resolves tenant scope, classifies the message into query tags, and enforces NO_RELEVANT_TAG behavior.
  static async chat(input: ChatRuntimeInput): Promise<ChatRuntimeResult> {
    const { chatbotId, displayName } = await this.resolveChatbot(input);
    const queryTags = await TagService.classifyQuestion(input.message);

    if (queryTags.length === 0) {
      throw new AppError('No relevant tags for this question', 400, 'NO_RELEVANT_TAG');
    }

    // TODO(feature-8.5/8.6/8.7): fetch tenant-scoped items by queryTags and call LLM with assembled context.
    // We intentionally return a placeholder to keep Feature 8.4 focused on resolution + classification only.
    return {
      answer:
        `Chat runtime pipeline not fully implemented yet for ${displayName} (chatbot ${chatbotId}). ` +
        `Classification is active and matched tags: ${queryTags.join(', ')}.`,
      sourceItems: []
    };
  }

  // handleChat remains as compatibility alias for older callers while codebase migrates to chat(...).
  static async handleChat(input: ChatRuntimeInput): Promise<ChatRuntimeResult> {
    return this.chat(input);
  }

  // resolveChatbot selects chatbot by chatbotId first, then by domain, matching validation/controller contracts.
  // If neither key exists (unexpected after validation) we fail fast with a controlled validation-style AppError.
  // This resolved context is the strict tenant boundary for all downstream runtime operations.
  private static async resolveChatbot(input: ChatRuntimeInput): Promise<ResolvedChatbotContext> {
    let chatbot: ChatbotModel | null = null;

    if (typeof input.chatbotId === 'number') {
      chatbot = await ChatbotModel.findByPk(input.chatbotId);
    } else if (input.domain) {
      chatbot = await ChatbotModel.findOne({ where: { domain: input.domain } });
    } else {
      throw new AppError('chatbotId or domain is required', 400, 'VALIDATION_ERROR');
    }

    if (!chatbot) {
      throw new AppError('Chatbot not found', 404, 'CHATBOT_NOT_FOUND');
    }

    return {
      chatbotId: Number(chatbot.chatbot_id),
      displayName: chatbot.display_name
    };
  }
}
