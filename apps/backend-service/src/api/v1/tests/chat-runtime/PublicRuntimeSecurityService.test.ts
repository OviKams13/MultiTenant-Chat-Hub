/// <reference types="jest" />
import { AppError } from '../../errors/AppError';
import { ChatbotAllowedOriginModel } from '../../models/ChatbotAllowedOriginModel';
import { PublicRuntimeSecurityService } from '../../services/PublicRuntimeSecurityService';

describe('PublicRuntimeSecurityService', () => {
  const originalFindAll = ChatbotAllowedOriginModel.findAll;

  afterAll(() => {
    ChatbotAllowedOriginModel.findAll = originalFindAll;
  });

  it('allows request when origin is in chatbot allowlist', async () => {
    ChatbotAllowedOriginModel.findAll = jest
      .fn()
      .mockResolvedValue([{ origin: 'https://shop.example.com' }] as never);

    await expect(
      PublicRuntimeSecurityService.assertOriginAllowed(11, 'https://shop.example.com'),
    ).resolves.toBeUndefined();
  });


  it('allows wildcard origin entry', async () => {
    ChatbotAllowedOriginModel.findAll = jest.fn().mockResolvedValue([{ origin: '*' }] as never);

    await expect(
      PublicRuntimeSecurityService.assertOriginAllowed(11, 'https://anywhere.example.com'),
    ).resolves.toBeUndefined();
  });

  it('rejects disallowed origin with ORIGIN_NOT_ALLOWED', async () => {
    ChatbotAllowedOriginModel.findAll = jest
      .fn()
      .mockResolvedValue([{ origin: 'https://allowed.example.com' }] as never);

    await expect(
      PublicRuntimeSecurityService.assertOriginAllowed(11, 'https://evil.example.com'),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'ORIGIN_NOT_ALLOWED',
        statusCode: 403,
      }),
    );
  });

  it('rejects missing origin when bypass is disabled', async () => {
    const originalBypass = process.env.PUBLIC_RUNTIME_ALLOW_MISSING_ORIGIN;
    const originalNodeEnv = process.env.NODE_ENV;

    process.env.PUBLIC_RUNTIME_ALLOW_MISSING_ORIGIN = 'false';
    process.env.NODE_ENV = 'development';

    try {
      await expect(PublicRuntimeSecurityService.assertOriginAllowed(11, undefined)).rejects.toEqual(
        expect.objectContaining({
          code: 'ORIGIN_NOT_ALLOWED',
          statusCode: 403,
        }),
      );
    } finally {
      process.env.PUBLIC_RUNTIME_ALLOW_MISSING_ORIGIN = originalBypass;
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('rejects malformed widgetKey format', () => {
    expect(() => PublicRuntimeSecurityService.assertWidgetKeyFormat('bad key with spaces')).toThrow(
      AppError,
    );
  });
});
