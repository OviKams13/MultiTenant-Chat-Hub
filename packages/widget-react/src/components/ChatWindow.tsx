import React from "react";

import type { ChatMessage } from "@mth/shared-types";

import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

interface ChatWindowProps {
  title: string;
  messages: ChatMessage[];
  isLoading: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmitMessage: (message: string) => Promise<void>;
  theme: "light" | "dark";
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  title,
  messages,
  isLoading,
  errorMessage,
  onClose,
  onSubmitMessage,
  theme,
}) => (
  <div
    style={{
      width: 360,
      height: 520,
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 18px 40px rgba(0,0,0,0.2)",
      border: theme === "dark" ? "1px solid #1f2937" : "1px solid #e5e7eb",
      backgroundColor: theme === "dark" ? "#030712" : "#ffffff",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
        borderBottom:
          theme === "dark" ? "1px solid #1f2937" : "1px solid #e5e7eb",
      }}
    >
      <strong style={{ color: theme === "dark" ? "#f3f4f6" : "#111827" }}>
        {title}
      </strong>
      <button type="button" aria-label="Close chat" onClick={onClose}>
        ×
      </button>
    </div>

    {errorMessage ? (
      <div
        role="alert"
        style={{
          margin: 12,
          padding: "8px 10px",
          borderRadius: 8,
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#b91c1c",
          fontSize: 14,
        }}
      >
        {errorMessage}
      </div>
    ) : null}

    <MessageList messages={messages} isLoading={isLoading} theme={theme} />
    <MessageInput isLoading={isLoading} onSubmit={onSubmitMessage} />
  </div>
);
