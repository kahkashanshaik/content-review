import { EXTRACTABLE_ELEMENT_TYPES, type ExtractableElementType } from "../../domain/types.ts";

export const SKIPPED_EXTRACTION_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "head",
  "svg",
  "math",
  "iframe",
  "object",
  "embed",
  "canvas",
]);

const EXTRACTABLE_TAGS = new Set<string>(EXTRACTABLE_ELEMENT_TYPES);

export function tagNameOf(element: { tagName: string }): string {
  return element.tagName.toLowerCase();
}

export function isExtractableTag(tag: string): tag is ExtractableElementType {
  return EXTRACTABLE_TAGS.has(tag);
}

export function shouldSkipTag(tag: string): boolean {
  return SKIPPED_EXTRACTION_TAGS.has(tag);
}
