import { detectTextDirection, isTextDirection } from "../../domain/direction.ts";
import type { TextDirection } from "../../domain/types.ts";
import type { HtmlElement } from "./dom.ts";

export { detectTextDirection };

export function resolveDirection(
  element: HtmlElement,
  text: string,
): TextDirection {
  const own = ownDirection(element);
  if (own === "ltr" || own === "rtl") {
    return own;
  }

  const wrapped = nearestDirection(element.parentElement, { includeDocumentRoots: false });
  if (wrapped === "ltr" || wrapped === "rtl") {
    return wrapped;
  }

  const detected = detectTextDirection(text);
  if (detected !== "auto") {
    return detected;
  }

  const documentDir = nearestDirection(element.parentElement, { includeDocumentRoots: true });
  if (documentDir === "ltr" || documentDir === "rtl") {
    return documentDir;
  }

  return own ?? "auto";
}

export function resolveLanguage(element: HtmlElement): string | undefined {
  let current: HtmlElement | null = element;

  while (current !== null) {
    const lang = current.getAttribute("lang") ?? current.getAttribute("xml:lang");
    const trimmed = lang?.trim();
    if (trimmed) {
      return trimmed;
    }
    current = current.parentElement;
  }

  return undefined;
}

function ownDirection(element: HtmlElement): TextDirection | undefined {
  const dir = element.getAttribute("dir")?.trim().toLowerCase();
  if (dir !== undefined && isTextDirection(dir)) {
    return dir;
  }

  const styleDirection = inlineStyleValue(element, "direction");
  if (styleDirection !== undefined && isTextDirection(styleDirection)) {
    return styleDirection;
  }

  return undefined;
}

function nearestDirection(
  start: HtmlElement | null,
  options: { includeDocumentRoots: boolean },
): TextDirection | undefined {
  let current = start;

  while (current !== null) {
    if (isDocumentRoot(current) === options.includeDocumentRoots) {
      const dir = ownDirection(current);
      if (dir === "ltr" || dir === "rtl") {
        return dir;
      }
    }

    current = current.parentElement;
  }

  return undefined;
}

function isDocumentRoot(element: HtmlElement): boolean {
  const tag = element.tagName.toUpperCase();
  return tag === "HTML" || tag === "BODY";
}

function inlineStyleValue(element: HtmlElement, property: string): string | undefined {
  const style = element.getAttribute("style");
  if (style === null || style.trim() === "") {
    return undefined;
  }

  const pattern = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "i");
  const match = pattern.exec(style);
  return match?.[1]?.trim().toLowerCase();
}
