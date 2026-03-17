import React from "react";

import { ChatWindow } from "./ChatWindow";
import { FloatingButton } from "./FloatingButton";
import { useChatbotWidget } from "../hooks/useChatbotWidget";
import type { ChatbotWidgetProps } from "../types";

const positionStyles: Record<
  NonNullable<ChatbotWidgetProps["position"]>,
  React.CSSProperties
> = {
  "bottom-right": { right: 20, bottom: 20, alignItems: "flex-end" },
  "bottom-left": { left: 20, bottom: 20, alignItems: "flex-start" },
  "top-right": { right: 20, top: 20, alignItems: "flex-end" },
  "top-left": { left: 20, top: 20, alignItems: "flex-start" },
};

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  domain,
  apiBaseUrl,
  title = "Chat",
  theme = "light",
  position = "bottom-right",
  welcomeMessage,
  primaryColor,
  zIndex = 1000,
  openByDefault,
  maxHistoryMessages,
  className,
  onOpen,
  onClose,
  onMessageSent,
  onError,
}) => {
  const {
    isOpen,
    messages,
    isLoading,
    errorMessage,
    toggleOpen,
    close,
    submitMessage,
  } = useChatbotWidget({
    domain,
    apiBaseUrl,
    welcomeMessage,
    openByDefault,
    maxHistoryMessages,
    onOpen,
    onClose,
    onMessageSent,
    onError,
  });

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        zIndex,
        ...positionStyles[position],
      }}
    >
      {isOpen ? (
        <ChatWindow
          title={title}
          messages={messages}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onClose={close}
          onSubmitMessage={submitMessage}
          theme={theme}
        />
      ) : null}

      <FloatingButton
        isOpen={isOpen}
        onClick={toggleOpen}
        primaryColor={primaryColor}
        label="Chat"
      />
    </div>
  );
};
