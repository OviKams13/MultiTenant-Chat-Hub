export { ChatApiClient } from "./client/ChatApiClient";
export { sendMessage } from "./runtime/sendMessage";
export type {
  SendMessageOptions,
  SendMessageResult,
} from "./runtime/sendMessage";
export { normalizeDomain } from "./runtime/normalizeDomain";
export { serializeHistory } from "./runtime/serializeHistory";
export { parsePublicChatResponse } from "./runtime/parseResponse";
export { WidgetRuntimeError } from "./runtime/errors";
export type { WidgetRuntimeErrorCode } from "@mth/shared-types";
