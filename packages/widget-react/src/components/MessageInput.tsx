import React, { useState } from "react";

interface MessageInputProps {
  isLoading: boolean;
  onSubmit: (value: string) => Promise<void>;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  isLoading,
  onSubmit,
}) => {
  const [value, setValue] = useState("");

  const handleSubmit = async (): Promise<void> => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) {
      return;
    }

    setValue("");
    await onSubmit(trimmed);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: 12,
        borderTop: "1px solid #e5e7eb",
      }}
    >
      <input
        aria-label="Message"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void handleSubmit();
          }
        }}
        placeholder="Type your message"
        disabled={isLoading}
        style={{
          flex: 1,
          borderRadius: 8,
          border: "1px solid #d1d5db",
          padding: "8px 10px",
        }}
      />
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isLoading}
      >
        Send
      </button>
    </div>
  );
};
