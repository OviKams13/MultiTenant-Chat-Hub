/**
 * Normalizes tenant domain input into backend-friendly host form.
 *
 * Strategy:
 * - trim whitespace
 * - if a scheme is present (or input starts with //), parse as URL and return hostname
 * - if no scheme and slash appears, return substring before first slash
 * - remove trailing slash and lowercase output for stable lookup behavior
 */
export const normalizeDomain = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  const tryParseUrl = (value: string): URL | null => {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  };

  const parsed =
    tryParseUrl(trimmed) ??
    (trimmed.startsWith("//") ? tryParseUrl(`https:${trimmed}`) : null);

  let domain = parsed ? parsed.hostname : trimmed;

  if (!parsed && domain.includes("/")) {
    [domain] = domain.split("/");
  }

  return domain.replace(/\/+$/, "").toLowerCase();
};
