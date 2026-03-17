import type { ChatMessage } from "@mth/shared-types";

/**
 * Produces a safe history payload copy using stable { role, content } shape.
 * Empty/blank content items are dropped to avoid sending invalid messages.
 */
export const serializeHistory = (
  history?: ChatMessage[],
): ChatMessage[] | undefined => {
  if (!history?.length) {
    return undefined;
  }

  const serialized = history
    .filter(
      (message): message is ChatMessage =>
        Boolean(message) &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));

  return serialized.length > 0 ? serialized : undefined;
};
