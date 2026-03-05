import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ApiError } from "@/lib/api";
import { PublicChatHistoryMessage, userApi } from "@/lib/user-api";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface ChatWidgetProps {
  shopName: string;
  domain: string;
}

// ChatWidget provides end-user runtime chat from mall pages and now integrates with backend public chat API.
// Domain is passed from URL context so requests stay tenant-scoped even when multiple admins expose chatbots.
// History is converted from UI messages to backend format so Gemini can keep conversational continuity.
// Widget keeps UX simple: optimistic user bubble, loading indicator, and safe fallback errors when API fails.
const ChatWidget = ({ shopName, domain }: ChatWidgetProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: `Hi! Ask me anything about ${shopName || "this shop"}.` }
  ]);

  // runtimeHistory removes greeting noise and maps UI message roles to backend runtime schema.
  const runtimeHistory = useMemo<PublicChatHistoryMessage[]>(
    () =>
      messages
        .slice(1)
        .map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.text
        })),
    [messages]
  );

  // sendMessage posts the current question to /api/v1/public/chat using domain routing and appends assistant answer.
  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || sending) return;

    if (!domain) {
      setMessages((previous) => [
        ...previous,
        { role: "user", text: trimmedInput },
        { role: "assistant", text: "This chatbot domain is missing, so I cannot start the conversation." }
      ]);
      setInput("");
      return;
    }

    const nextUserMessage: Message = { role: "user", text: trimmedInput };
    setMessages((previous) => [...previous, nextUserMessage]);
    setInput("");
    setSending(true);

    try {
      const response = await userApi.chatByDomain({
        domain,
        message: trimmedInput,
        history: [...runtimeHistory, { role: "user", content: trimmedInput }]
      });

      setMessages((previous) => [...previous, { role: "assistant", text: response.answer }]);
    } catch (error: unknown) {
      const defaultError = "The assistant is temporarily unavailable. Please try again in a moment.";
      const errorMessage =
        error instanceof ApiError ? error.payload?.message ?? defaultError : error instanceof Error ? error.message : defaultError;

      setMessages((previous) => [...previous, { role: "assistant", text: errorMessage }]);
    } finally {
      setSending(false);
    }
  };

  // headerSubtitle gives users quick tenant visibility by showing current domain inside the widget header.
  const headerSubtitle = domain || "Unknown domain";

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 px-4 items-center justify-center border bg-card text-foreground"
          aria-label="Open chatbot widget"
        >
          Chat
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 border bg-card flex flex-col"
          style={{ height: "28rem" }}
        >
          <div className="flex items-center justify-between border-b bg-secondary px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{shopName || "Shop"} Assistant</p>
              <p className="text-xs text-muted-foreground">{headerSubtitle}</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-foreground" aria-label="Close chatbot widget">Close</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] border px-3 py-2 text-sm ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] border px-3 py-2 text-sm bg-secondary text-secondary-foreground">Thinking…</div>
              </div>
            )}
          </div>

          <div className="border-t p-3 flex gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your message…"
              onKeyDown={(event) => event.key === "Enter" && void sendMessage()}
              className="text-sm"
              disabled={sending}
            />
            <Button onClick={() => void sendMessage()} className="shrink-0" disabled={sending}>
              Send
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
