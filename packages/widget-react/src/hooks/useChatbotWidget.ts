import { useCallback, useMemo, useState } from "react";

import type { ChatMessage, WidgetRuntimeErrorCode } from "@mth/shared-types";
import { WidgetRuntimeError, sendMessage } from "@mth/widget-core";

import type { UseChatbotWidgetOptions, UseChatbotWidgetResult } from "../types";

const ERROR_MESSAGES: Record<WidgetRuntimeErrorCode, string> = {
  NETWORK_ERROR: "Network error. Please try again.",
  TIMEOUT: "The request timed out. Please try again.",
  RATE_LIMITED: "Too many requests. Please wait a moment.",
  CHATBOT_NOT_FOUND: "This chatbot is not available.",
  LLM_UNAVAILABLE: "The response service is temporarily unavailable.",
  ORIGIN_NOT_ALLOWED: "This website is not allowed to use this chatbot yet.",
  INVALID_WIDGET_KEY: "This widget configuration is invalid. Please contact support.",
  UNKNOWN_ERROR: "Something went wrong.",
};

const trimHistory = (
  history: ChatMessage[],
  maxHistoryMessages?: number,
): ChatMessage[] => {
  if (
    !maxHistoryMessages ||
    maxHistoryMessages <= 0 ||
    history.length <= maxHistoryMessages
  ) {
    return history;
  }

  return history.slice(history.length - maxHistoryMessages);
};

export const useChatbotWidget = (
  options: UseChatbotWidgetOptions,
): UseChatbotWidgetResult => {
  const initialMessages = useMemo<ChatMessage[]>(() => {
    if (!options.welcomeMessage?.trim()) {
      return [];
    }

    return [
      {
        role: "assistant",
        content: options.welcomeMessage.trim(),
      },
    ];
  }, [options.welcomeMessage]);

  const [isOpen, setIsOpen] = useState<boolean>(Boolean(options.openByDefault));
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<WidgetRuntimeErrorCode | null>(
    null,
  );

  const errorMessage = useMemo(() => {
    if (!errorCode) {
      return null;
    }

    return ERROR_MESSAGES[errorCode];
  }, [errorCode]);

  const toggleOpen = useCallback(() => {
    setIsOpen((currentOpen) => {
      const nextOpen = !currentOpen;
      if (nextOpen) {
        options.onOpen?.();
      } else {
        options.onClose?.();
      }

      return nextOpen;
    });
  }, [options]);

  const close = useCallback(() => {
    setIsOpen((currentOpen) => {
      if (currentOpen) {
        options.onClose?.();
      }

      return false;
    });
  }, [options]);

  const submitMessage = useCallback(
    async (rawMessage: string): Promise<void> => {
      const message = rawMessage.trim();
      if (!message || isLoading) {
        return;
      }

      options.onMessageSent?.(message);

      const nextUserMessage: ChatMessage = {
        role: "user",
        content: message,
      };

      const currentMessages = messages;
      const nextMessages = [...currentMessages, nextUserMessage];
      const historyToSend = trimHistory(
        nextMessages,
        options.maxHistoryMessages,
      );

      setMessages(nextMessages);
      setIsLoading(true);
      setErrorCode(null);

      try {
        const result = await sendMessage({
          domain: options.domain,
          apiBaseUrl: options.apiBaseUrl,
          message,
          history: historyToSend,
        });

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            content: result.answer,
          },
        ]);
      } catch (error) {
        if (error instanceof WidgetRuntimeError) {
          setErrorCode(error.code);
        } else {
          setErrorCode("UNKNOWN_ERROR");
        }

        options.onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, options],
  );

  return {
    isOpen,
    messages,
    isLoading,
    errorCode,
    errorMessage,
    toggleOpen,
    close,
    submitMessage,
  };
};
