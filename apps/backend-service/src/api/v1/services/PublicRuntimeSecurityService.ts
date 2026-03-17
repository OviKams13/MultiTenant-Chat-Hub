import { logger } from '../../../config/Logger';
import { AppError } from '../errors/AppError';
import { ChatbotAllowedOriginModel } from '../models/ChatbotAllowedOriginModel';

const WIDGET_KEY_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;

export interface PublicRuntimeSecurityContext {
  chatbotId: number;
  originHeader: string | undefined;
  widgetKey: string | undefined;
}

export class PublicRuntimeSecurityService {
  static async assertPublicRuntimeAccess(input: PublicRuntimeSecurityContext): Promise<void> {
    await this.assertOriginAllowed(input.chatbotId, input.originHeader);
    this.assertWidgetKeyFormat(input.widgetKey);

    if (input.widgetKey) {
      logger.info(`[public-runtime] widgetKey=${input.widgetKey} chatbotId=${input.chatbotId}`);
    }
  }

  static async assertOriginAllowed(
    chatbotId: number,
    originHeader: string | undefined,
  ): Promise<void> {
    if (!originHeader) {
      if (this.isMissingOriginBypassEnabled()) {
        return;
      }

      throw new AppError(
        'Origin header is required for public widget runtime requests. For local testing, set PUBLIC_RUNTIME_ALLOW_MISSING_ORIGIN=true in non-production.',
        403,
        'ORIGIN_NOT_ALLOWED',
      );
    }

    const normalizedOrigin = this.normalizeOrigin(originHeader);

    const allowedOrigins = await ChatbotAllowedOriginModel.findAll({
      where: { chatbot_id: chatbotId },
    });

    const isAllowed = allowedOrigins.some((originRow) => {
      const allowedOrigin = originRow.origin.toLowerCase();
      return allowedOrigin === "*" || allowedOrigin === normalizedOrigin;
    });

    if (!isAllowed) {
      throw new AppError('Origin is not allowed for this chatbot.', 403, 'ORIGIN_NOT_ALLOWED', {
        origin: normalizedOrigin,
      });
    }
  }

  static assertWidgetKeyFormat(widgetKey: string | undefined): void {
    if (!widgetKey) {
      return;
    }

    if (!WIDGET_KEY_REGEX.test(widgetKey)) {
      throw new AppError('Invalid widgetKey format.', 400, 'INVALID_WIDGET_KEY');
    }
  }

  static normalizeOrigin(origin: string): string {
    let parsed: URL;

    try {
      parsed = new URL(origin);
    } catch {
      throw new AppError('Invalid Origin header value.', 403, 'ORIGIN_NOT_ALLOWED');
    }

    return parsed.origin.toLowerCase();
  }

  static isMissingOriginBypassEnabled(): boolean {
    return (
      process.env.NODE_ENV === 'test' ||
      (process.env.NODE_ENV !== 'production' &&
        process.env.PUBLIC_RUNTIME_ALLOW_MISSING_ORIGIN === 'true')
    );
  }
}
