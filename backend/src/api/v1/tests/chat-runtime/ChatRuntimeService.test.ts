/// <reference types="jest" />
// Runtime environment variables are configured before module loading so constants bootstrap succeeds in test mode.
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';

const { AppError } = require('../../errors/AppError') as { AppError: any };
const { ChatRuntimeService } = require('../../services/ChatRuntimeService') as {
  ChatRuntimeService: {
    chat: (input: unknown) => Promise<unknown>;
    fetchKnowledgeItems: unknown;
  };
};
const { LLMError, LLMService } = require('../../services/LLMService') as {
  LLMError: new (code: string, message?: string) => Error;
  LLMService: { askGemini: (...args: unknown[]) => Promise<string> };
};
const { TagService } = require('../../services/TagService') as {
  TagService: { classifyQuestion: (...args: unknown[]) => Promise<string[]> };
};
const { ChatbotModel } = require('../../models/ChatbotModel') as { ChatbotModel: { findByPk: (...args: unknown[]) => Promise<unknown> } };

// Feature 8.9 unit tests isolate ChatRuntimeService orchestration without relying on real database/network dependencies.
// We monkey-patch static collaborators (models/services) so each case focuses on one business behavior at a time.
// The scenarios reflect production runtime paths: tenant lookup, tag classification, context creation, and LLM fallback mapping.
// Assertions validate both output payload and integration contracts passed to LLMService.
describe('ChatRuntimeService Feature 8.9 unit tests', () => {
  const originalFindByPk = ChatbotModel.findByPk;
  const originalClassifyQuestion = TagService.classifyQuestion;
  const originalFetchKnowledgeItems = (ChatRuntimeService as unknown as { fetchKnowledgeItems: unknown }).fetchKnowledgeItems;
  const originalAskGemini = LLMService.askGemini;

  // resetRuntimeMocks restores static collaborators so each test remains independent and deterministic.
  function resetRuntimeMocks(): void {
    ChatbotModel.findByPk = originalFindByPk;
    TagService.classifyQuestion = originalClassifyQuestion;
    (ChatRuntimeService as unknown as { fetchKnowledgeItems: unknown }).fetchKnowledgeItems = originalFetchKnowledgeItems;
    LLMService.askGemini = originalAskGemini;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    resetRuntimeMocks();
  });

  afterAll(() => {
    resetRuntimeMocks();
  });

  it('should return answer and sourceItems on happy path and call LLM with non-empty context', async () => {
    let llmPayload: unknown;

    // Mock chatbot resolution for tenant A in dashboard mode.
    ChatbotModel.findByPk = jest.fn().mockResolvedValue({ chatbot_id: 1, display_name: 'Tenant A Bot' } as never);
    // Mock tag classification to route context retrieval toward contact information.
    TagService.classifyQuestion = jest.fn().mockResolvedValue(['CONTACT']);
    // Mock knowledge retrieval to produce one CONTACT item for context generation.
    (ChatRuntimeService as unknown as { fetchKnowledgeItems: jest.Mock }).fetchKnowledgeItems = jest.fn().mockResolvedValue([
      { kind: 'CONTACT', entityId: 10, createdAt: new Date('2026-01-01T00:00:00.000Z'), contact: { city: 'Paris' } }
    ]);

    // Mock LLM provider output and capture prompt payload for contract assertions.
    LLMService.askGemini = jest.fn().mockImplementation(async (payload: unknown) => {
      llmPayload = payload;
      return 'Test answer';
    });

    const result = (await ChatRuntimeService.chat({ chatbotId: 1, message: 'What is your address?', history: [] })) as {
      answer: string;
      sourceItems: Array<{ entity_id: number }>;
    };

    expect(LLMService.askGemini).toHaveBeenCalledTimes(1);
    expect(llmPayload).toEqual(expect.objectContaining({ contextText: expect.any(String) }));
    expect((llmPayload as { contextText: string }).contextText.length).toBeGreaterThan(0);
    expect(result.answer).toBe('Test answer');
    expect(result.sourceItems.length).toBeGreaterThan(0);
  });

  it('should enforce tenant isolation so chatbot A context never leaks chatbot B data', async () => {
    let llmPayload: unknown;

    // Tenant A resolves first and receives tags that could match records in multiple tenants.
    ChatbotModel.findByPk = jest.fn().mockResolvedValue({ chatbot_id: 1, display_name: 'Tenant A Bot' } as never);
    TagService.classifyQuestion = jest.fn().mockResolvedValue(['CONTACT']);
    // Mock retrieval returns only A-owned markers even if user message mentions chatbot B.
    (ChatRuntimeService as unknown as { fetchKnowledgeItems: jest.Mock }).fetchKnowledgeItems = jest
      .fn()
      .mockImplementation(async (chatbotId: number) => {
        if (chatbotId === 1) {
          return [
            {
              kind: 'CONTACT',
              entityId: 101,
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              contact: { tenant_marker: 'TENANT_A_ONLY' }
            }
          ];
        }

        return [
          {
            kind: 'CONTACT',
            entityId: 202,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            contact: { tenant_marker: 'TENANT_B_ONLY' }
          }
        ];
      });

    // Capture final context text to verify no cross-tenant marker appears in A requests.
    LLMService.askGemini = jest.fn().mockImplementation(async (payload: unknown) => {
      llmPayload = payload;
      return 'Tenant isolated answer';
    });

    const result = (await ChatRuntimeService.chat({ chatbotId: 1, message: 'What about chatbot B address?' })) as {
      sourceItems: Array<{ entity_id: number }>;
    };

    expect(result.sourceItems.map((item) => item.entity_id)).toEqual([101]);
    expect((llmPayload as { contextText: string }).contextText).toContain('TENANT_A_ONLY');
    expect((llmPayload as { contextText: string }).contextText).not.toContain('TENANT_B_ONLY');
  });

  it('should throw NO_RELEVANT_TAG when classifyQuestion returns an empty list', async () => {
    // Tenant resolves, but business classifier cannot map the question to any supported tag.
    ChatbotModel.findByPk = jest.fn().mockResolvedValue({ chatbot_id: 1, display_name: 'Tenant A Bot' } as never);
    TagService.classifyQuestion = jest.fn().mockResolvedValue([]);
    (ChatRuntimeService as unknown as { fetchKnowledgeItems: jest.Mock }).fetchKnowledgeItems = jest
      .fn()
      .mockRejectedValue(new Error('fetchKnowledgeItems should not be called when no tags are found'));
    // LLM should never execute in this branch because classification exits early with NO_RELEVANT_TAG.
    LLMService.askGemini = jest.fn();

    await expect(ChatRuntimeService.chat({ chatbotId: 1, message: 'Completely unrelated sentence' })).rejects.toMatchObject({
      code: 'NO_RELEVANT_TAG'
    });
    expect(LLMService.askGemini).not.toHaveBeenCalled();
  });

  it('should call LLM with minimal context when tags exist but no knowledge items are found', async () => {
    let llmPayload: unknown;

    // Tenant and tags resolve correctly, but there are no matching records in chatbot_items for this tag set.
    ChatbotModel.findByPk = jest.fn().mockResolvedValue({ chatbot_id: 1, display_name: 'Tenant A Bot' } as never);
    TagService.classifyQuestion = jest.fn().mockResolvedValue(['CONTACT']);
    (ChatRuntimeService as unknown as { fetchKnowledgeItems: jest.Mock }).fetchKnowledgeItems = jest.fn().mockResolvedValue([]);

    // LLM still receives a deterministic context skeleton and returns a user-facing answer.
    LLMService.askGemini = jest.fn().mockImplementation(async (payload: unknown) => {
      llmPayload = payload;
      return 'I do not have enough information.';
    });

    const result = (await ChatRuntimeService.chat({ chatbotId: 1, message: 'What is your phone number?' })) as {
      answer: string;
      sourceItems: unknown[];
    };

    expect(result.answer).toBe('I do not have enough information.');
    expect(result.sourceItems).toEqual([]);
    expect((llmPayload as { contextText: string }).contextText).toContain('Chatbot knowledge context:');
  });

  it('should map LLMError to AppError LLM_UNAVAILABLE instead of leaking provider error', async () => {
    // Tenant and context steps succeed so we can isolate behavior of LLM error mapping in runtime service.
    ChatbotModel.findByPk = jest.fn().mockResolvedValue({ chatbot_id: 1, display_name: 'Tenant A Bot' } as never);
    TagService.classifyQuestion = jest.fn().mockResolvedValue(['CONTACT']);
    (ChatRuntimeService as unknown as { fetchKnowledgeItems: jest.Mock }).fetchKnowledgeItems = jest.fn().mockResolvedValue([
      { kind: 'CONTACT', entityId: 10, createdAt: new Date('2026-01-01T00:00:00.000Z'), contact: { city: 'Paris' } }
    ]);

    // Provider-level timeout should be translated to stable API contract error code LLM_UNAVAILABLE.
    LLMService.askGemini = jest.fn().mockRejectedValue(new LLMError('TIMEOUT', 'Provider timeout'));

    await expect(ChatRuntimeService.chat({ chatbotId: 1, message: 'What is your address?' })).rejects.toEqual(
      expect.objectContaining({ code: 'LLM_UNAVAILABLE', statusCode: 503 })
    );
  });
});
