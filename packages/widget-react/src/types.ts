import type {
  ChatMessage,
  WidgetConfig,
  WidgetRuntimeErrorCode,
} from "@mth/shared-types";

export type WidgetTheme = "light" | "dark";

export interface ChatbotWidgetProps extends Pick<
  WidgetConfig,
  | "domain"
  | "apiBaseUrl"
  | "title"
  | "position"
  | "welcomeMessage"
  | "primaryColor"
  | "zIndex"
  | "openByDefault"
  | "maxHistoryMessages"
> {
  theme?: WidgetTheme;
  className?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onMessageSent?: (message: string) => void;
  onError?: (error: unknown) => void;
}

export interface UseChatbotWidgetOptions {
  domain: string;
  apiBaseUrl: string;
  welcomeMessage?: string;
  openByDefault?: boolean;
  maxHistoryMessages?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onMessageSent?: (message: string) => void;
  onError?: (error: unknown) => void;
}

export interface UseChatbotWidgetResult {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  errorCode: WidgetRuntimeErrorCode | null;
  errorMessage: string | null;
  toggleOpen: () => void;
  close: () => void;
  submitMessage: (message: string) => Promise<void>;
}
