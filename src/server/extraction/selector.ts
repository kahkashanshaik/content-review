import { createHash } from "node:crypto";

import { tagNameOf } from "./tags.ts";
import type { HtmlElement } from "./dom.ts";

export function elementSelector(element: HtmlElement): string {
  const parts: string[] = [];
  let current: HtmlElement | null = element;

  while (current !== null && tagNameOf(current) !== "html") {
    const tag = tagNameOf(current);
    const parent: HtmlElement | null = current.parentElement;
    if (parent === null) {
      parts.unshift(tag);
      break;
    }

    const index = nthOfType(parent, current);
    parts.unshift(`${tag}:nth-of-type(${index})`);
    current = parent;
  }

  return parts.join(" > ");
}

export function stableContentId(selector: string, namespace = ""): string {
  const seed = namespace === "" ? selector : `${namespace}\0${selector}`;
  const digest = createHash("sha256").update(seed).digest("hex").slice(0, 32);
  return `content_${digest}`;
}

function nthOfType(parent: HtmlElement, element: HtmlElement): number {
  const tag = element.tagName;
  let index = 0;

  for (let i = 0; i < parent.children.length; i += 1) {
    const sibling = parent.children[i];
    if (sibling === undefined || sibling.tagName !== tag) {
      continue;
    }

    index += 1;
    if (sibling === element) {
      return index;
    }
  }

  return 1;
}
