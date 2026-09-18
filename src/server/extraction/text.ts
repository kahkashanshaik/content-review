import type { HtmlElement, HtmlNode } from "./dom.ts";
import { isHtmlElement, TEXT_NODE } from "./dom.ts";
import { shouldSkipTag, tagNameOf } from "./tags.ts";

export function visibleText(element: HtmlElement): string {
  return normalizeText(collectText(element));
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const BREAK_TAGS = new Set(["br", "wbr", "hr"]);

function collectText(node: HtmlNode): string {
  if (node.nodeType === TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (!isHtmlElement(node) || shouldSkipTag(tagNameOf(node))) {
    return "";
  }

  const tag = tagNameOf(node);
  if (BREAK_TAGS.has(tag)) {
    return " ";
  }

  let text = "";
  for (let i = 0; i < node.childNodes.length; i += 1) {
    const child = node.childNodes[i];
    if (child !== undefined) {
      text += collectText(child);
    }
  }

  return text;
}
