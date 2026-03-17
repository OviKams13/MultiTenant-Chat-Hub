import React, { useEffect, useRef } from "react";

import type { ChatMessage } from "@mth/shared-types";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  theme: "light" | "dark";
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  theme,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages, isLoading]);

  return (
    <div
      ref={containerRef}
      style={{
        overflowY: "auto",
        flex: 1,
        padding: 12,
        backgroundColor: theme === "dark" ? "#111827" : "#f8fafc",
      }}
    >
      {messages.map((message, index) => {
        const isUser = message.role === "user";

        return (
          <div
            key={`${message.role}-${index.toString()}`}
            style={{
              display: "flex",
              justifyContent: isUser ? "flex-end" : "flex-start",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "8px 12px",
                borderRadius: 12,
                backgroundColor: isUser
                  ? "#2563eb"
                  : theme === "dark"
                    ? "#374151"
                    : "#e2e8f0",
                color: isUser
                  ? "#fff"
                  : theme === "dark"
                    ? "#f3f4f6"
                    : "#111827",
                whiteSpace: "pre-wrap",
              }}
            >
              {message.content}
            </div>
          </div>
        );
      })}
      {isLoading ? (
        <div
          style={{
            color: theme === "dark" ? "#d1d5db" : "#4b5563",
            fontSize: 14,
          }}
        >
          Assistant is typing...
        </div>
      ) : null}
    </div>
  );
};
