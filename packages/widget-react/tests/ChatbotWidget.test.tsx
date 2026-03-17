import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WidgetRuntimeError } from "@mth/widget-core";

import { ChatbotWidget } from "../src/components/ChatbotWidget";

const sendMessageMock = vi.fn();

vi.mock("@mth/widget-core", async () => {
  const actual =
    await vi.importActual<typeof import("@mth/widget-core")>(
      "@mth/widget-core",
    );

  return {
    ...actual,
    sendMessage: (...args: unknown[]) => sendMessageMock(...args),
  };
});

beforeEach(() => {
  sendMessageMock.mockReset();
});
describe("ChatbotWidget", () => {
  it("renders without crashing and shows floating button", () => {
    render(
      <ChatbotWidget
        domain="shop.example.com"
        apiBaseUrl="https://api.example.com"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Toggle chat (closed)" }),
    ).toBeInTheDocument();
  });

  it("opens and closes chat window", () => {
    render(
      <ChatbotWidget
        domain="shop.example.com"
        apiBaseUrl="https://api.example.com"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Toggle chat (closed)" }),
    );
    expect(screen.getByText("Chat")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Close chat" })[0]);
    expect(
      screen.queryByRole("button", { name: "Close chat" }),
    ).not.toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <ChatbotWidget
        domain="shop.example.com"
        apiBaseUrl="https://api.example.com"
        title="Ask us anything"
        openByDefault
      />,
    );

    expect(screen.getByText("Ask us anything")).toBeInTheDocument();
  });

  it("calls sendMessage and renders assistant response", async () => {
    sendMessageMock.mockResolvedValueOnce({
      answer: "Hello from assistant",
      sourceItems: [],
    });

    render(
      <ChatbotWidget
        domain="shop.example.com"
        apiBaseUrl="https://api.example.com"
        openByDefault
      />,
    );

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hi there" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledTimes(1);
    });

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: "shop.example.com",
        apiBaseUrl: "https://api.example.com",
        message: "Hi there",
      }),
    );

    expect(await screen.findByText("Hello from assistant")).toBeInTheDocument();
  });

  it("shows loading state while awaiting response", async () => {
    let resolvePromise:
      | ((value: { answer: string; sourceItems: unknown[] }) => void)
      | null = null;
    sendMessageMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    render(
      <ChatbotWidget
        domain="shop.example.com"
        apiBaseUrl="https://api.example.com"
        openByDefault
      />,
    );

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hi there" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("Assistant is typing...")).toBeInTheDocument();

    resolvePromise?.({ answer: "Done", sourceItems: [] });
    expect(await screen.findByText("Done")).toBeInTheDocument();
  });

  it("shows ui error message when runtime error is thrown", async () => {
    sendMessageMock.mockRejectedValueOnce(
      new WidgetRuntimeError("NETWORK_ERROR", "network issue"),
    );

    render(
      <ChatbotWidget
        domain="shop.example.com"
        apiBaseUrl="https://api.example.com"
        openByDefault
      />,
    );

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hi there" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("Network error. Please try again."),
    ).toBeInTheDocument();
  });


  it("shows origin-specific error message when origin is not allowed", async () => {
    sendMessageMock.mockRejectedValueOnce(
      new WidgetRuntimeError("ORIGIN_NOT_ALLOWED", "origin blocked"),
    );

    render(
      <ChatbotWidget
        domain="shop.example.com"
        apiBaseUrl="https://api.example.com"
        openByDefault
      />,
    );

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hi there" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("This website is not allowed to use this chatbot yet."),
    ).toBeInTheDocument();
  });

  it("respects openByDefault and welcomeMessage", () => {
    render(
      <ChatbotWidget
        domain="shop.example.com"
        apiBaseUrl="https://api.example.com"
        openByDefault
        welcomeMessage="Welcome!"
      />,
    );

    expect(screen.getByText("Welcome!")).toBeInTheDocument();
  });
});
