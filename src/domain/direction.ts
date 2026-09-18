import type { TextDirection } from "./types.ts";

export const RTL_STRONG =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
export const LTR_STRONG = /[A-Za-z\u00C0-\u024F]/;

export function isTextDirection(value: string): value is TextDirection {
  return value === "ltr" || value === "rtl" || value === "auto";
}

const URL_OR_EMAIL =
  /https?:\/\/[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gi;

export function detectTextDirection(text: string): TextDirection {
  const withoutUrls = text.replace(URL_OR_EMAIL, " ");
  for (const character of withoutUrls) {
    if (RTL_STRONG.test(character)) {
      return "rtl";
    }
    if (LTR_STRONG.test(character)) {
      return "ltr";
    }
  }

  return "auto";
}

export function resolveParagraphDirection(
  explicit: TextDirection | undefined,
  text: string,
): TextDirection {
  if (explicit !== undefined && explicit !== "auto") {
    return explicit;
  }

  const detected = detectTextDirection(text);
  return detected === "auto" ? "ltr" : detected;
}
