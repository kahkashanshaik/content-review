import { LTR_STRONG, RTL_STRONG, resolveParagraphDirection } from "./direction.ts";
import type { TextDirection } from "./types.ts";

export type BidiSegment = {
  text: string;
  dir?: "ltr" | "rtl";
};

const TOKEN =
  /https?:\/\/[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\d+(?:[.,]\d+)*|[A-Za-z\u00C0-\u024F]+|[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]+|\s+|./gu;

export function segmentMixedText(
  text: string,
  explicitDirection?: TextDirection,
): BidiSegment[] {
  const paragraphDir = resolveParagraphDirection(explicitDirection, text);
  const segments: BidiSegment[] = [];
  const tokens = text.match(TOKEN) ?? (text.length > 0 ? [text] : []);

  for (const token of tokens) {
    const isolate = isolateForToken(token, paragraphDir);
    const previous = segments[segments.length - 1];
    if (previous !== undefined && previous.dir === isolate) {
      previous.text += token;
      continue;
    }

    segments.push(isolate === undefined ? { text: token } : { text: token, dir: isolate });
  }

  return segments;
}

function isolateForToken(token: string, paragraphDir: TextDirection): "ltr" | "rtl" | undefined {
  if (/^https?:\/\//i.test(token) || token.includes("@")) {
    return paragraphDir === "rtl" ? "ltr" : undefined;
  }

  if (/^\d+(?:[.,]\d+)*$/.test(token)) {
    return paragraphDir === "rtl" ? "ltr" : undefined;
  }

  if (RTL_STRONG.test(token[0] ?? "")) {
    return paragraphDir === "ltr" ? "rtl" : undefined;
  }

  if (LTR_STRONG.test(token[0] ?? "")) {
    return paragraphDir === "rtl" ? "ltr" : undefined;
  }

  return undefined;
}
