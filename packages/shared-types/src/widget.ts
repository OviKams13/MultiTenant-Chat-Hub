export type WidgetRuntimeErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "CHATBOT_NOT_FOUND"
  | "LLM_UNAVAILABLE"
  | "UNKNOWN_ERROR";

export type WidgetPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

export interface WidgetConfig {
  domain: string;
  apiBaseUrl: string;
  theme?: string;
  title?: string;
  welcomeMessage?: string;
  position?: WidgetPosition;
  primaryColor?: string;
  zIndex?: number;
  openByDefault?: boolean;
  maxHistoryMessages?: number;
}
