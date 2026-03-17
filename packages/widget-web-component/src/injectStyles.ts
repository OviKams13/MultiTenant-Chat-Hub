import {
  CHATBOT_WIDGET_CSS,
  CHATBOT_WIDGET_STYLE_MARKER,
} from "./widgetStyles";

let constructableSheet: CSSStyleSheet | null = null;

const canUseAdoptedStyleSheets = (shadowRoot: ShadowRoot): boolean =>
  "adoptedStyleSheets" in ShadowRoot.prototype &&
  "replaceSync" in CSSStyleSheet.prototype &&
  Array.isArray(shadowRoot.adoptedStyleSheets);

const hasMarkedStyleElement = (shadowRoot: ShadowRoot): boolean =>
  Boolean(
    shadowRoot.querySelector(`style[${CHATBOT_WIDGET_STYLE_MARKER}="true"]`),
  );

export const injectWidgetStyles = (shadowRoot: ShadowRoot): void => {
  if (canUseAdoptedStyleSheets(shadowRoot)) {
    if (!constructableSheet) {
      constructableSheet = new CSSStyleSheet();
      constructableSheet.replaceSync(CHATBOT_WIDGET_CSS);
    }

    if (!shadowRoot.adoptedStyleSheets.includes(constructableSheet)) {
      shadowRoot.adoptedStyleSheets = [
        ...shadowRoot.adoptedStyleSheets,
        constructableSheet,
      ];
    }

    return;
  }

  if (hasMarkedStyleElement(shadowRoot)) {
    return;
  }

  const style = document.createElement("style");
  style.setAttribute(CHATBOT_WIDGET_STYLE_MARKER, "true");
  style.textContent = CHATBOT_WIDGET_CSS;
  shadowRoot.appendChild(style);
};
