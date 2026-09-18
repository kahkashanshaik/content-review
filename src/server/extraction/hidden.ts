import type { HtmlElement } from "./dom.ts";
import { tagNameOf } from "./tags.ts";

export function isHiddenElement(element: HtmlElement): boolean {
  if (element.getAttribute("hidden") !== null) {
    return true;
  }

  if (element.getAttribute("aria-hidden") === "true") {
    return true;
  }

  const style = element.getAttribute("style");
  if (style !== null && /display\s*:\s*none/i.test(style)) {
    return true;
  }

  const tag = tagNameOf(element);
  if (tag === "dialog" && element.getAttribute("open") === null) {
    return true;
  }

  return false;
}
