import React from "react";
import { createRoot, type Root } from "react-dom/client";

import { ChatbotWidget, type ChatbotWidgetProps } from "@mth/widget-react";

export interface WebComponentWidgetEventHandlers {
  onOpen: () => void;
  onClose: () => void;
  onMessageSent: (message: string) => void;
  onError: (error: unknown) => void;
}

export interface MountedReactWidget {
  render: (
    props: ChatbotWidgetProps,
    handlers: WebComponentWidgetEventHandlers,
  ) => void;
  unmount: () => void;
}

export const createReactWidgetMount = (
  container: HTMLElement,
): MountedReactWidget => {
  const root: Root = createRoot(container);

  return {
    render: (props, handlers) => {
      root.render(
        <ChatbotWidget
          {...props}
          onOpen={handlers.onOpen}
          onClose={handlers.onClose}
          onMessageSent={handlers.onMessageSent}
          onError={handlers.onError}
        />,
      );
    },
    unmount: () => {
      root.unmount();
    },
  };
};
