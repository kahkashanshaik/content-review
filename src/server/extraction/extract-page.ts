import { parseHTML } from "linkedom";

import type {
  ContentExtractor,
  ExtractedContentItem,
  ExtractedPageContent,
  ExtractOptions,
} from "../../application/ports/extractor.ts";
import type { Result } from "../../domain/errors.ts";
import type { HtmlElement } from "./dom.ts";
import { resolveDirection, resolveLanguage } from "./direction.ts";
import { isHiddenElement } from "./hidden.ts";
import { elementSelector, stableContentId } from "./selector.ts";
import { isExtractableTag, shouldSkipTag, tagNameOf } from "./tags.ts";
import { normalizeText, visibleText } from "./text.ts";

export function extractPageContent(
  html: string,
  options?: ExtractOptions,
): Result<ExtractedPageContent> {
  const { document } = parseHTML(html);
  const root = (document.body ?? document.documentElement) as HtmlElement | null;

  if (root === null) {
    return {
      ok: true,
      value: {
        documentDirection: "auto",
        items: [],
      },
    };
  }

  const items: ExtractedContentItem[] = [];
  walk(root, false, items, options?.idNamespace ?? "");

  const title = normalizeText(document.title ?? "");
  const documentElement = (document.documentElement ?? root) as HtmlElement;
  const documentLanguage = resolveLanguage(documentElement);
  const documentDirection = resolveDirection(documentElement, title);

  return {
    ok: true,
    value: {
      ...(title.length > 0 ? { title } : {}),
      documentDirection,
      ...(documentLanguage === undefined ? {} : { documentLanguage }),
      items,
    },
  };
}

export function createHtmlExtractor(): ContentExtractor {
  return {
    extract: extractPageContent,
  };
}

function walk(
  element: HtmlElement,
  ancestorExtracted: boolean,
  items: ExtractedContentItem[],
  idNamespace: string,
): void {
  const tag = tagNameOf(element);
  if (shouldSkipTag(tag) || isHiddenElement(element)) {
    return;
  }

  let extractedHere = false;
  if (isExtractableTag(tag) && !ancestorExtracted) {
    const text = visibleText(element);
    if (text.length > 0) {
      const selector = elementSelector(element);
      const language = resolveLanguage(element);
      items.push({
        id: stableContentId(selector, idNamespace),
        elementType: tag,
        text,
        selector,
        direction: resolveDirection(element, text),
        ...(language === undefined ? {} : { language }),
        order: items.length,
      });
      extractedHere = true;
    }
  }

  for (let i = 0; i < element.children.length; i += 1) {
    const child = element.children[i];
    if (child !== undefined) {
      walk(child, ancestorExtracted || extractedHere, items, idNamespace);
    }
  }
}
