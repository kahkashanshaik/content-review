import { tagNameOf } from "../extraction/tags.ts";
import { sanitizeCss } from "./css.ts";
import {
  attributeNames,
  detach,
  SNAPSHOT_CSP,
  walkElements,
  type SnapshotDocument,
  type SnapshotElement,
} from "./document.ts";
import { rewritePageUrl, rewriteSrcset, type UrlUsage } from "./urls.ts";
import { FREEZE_DYNAMIC_LAYOUT_CSS, FREEZE_LAYOUT_ATTRIBUTE } from "./freeze-layout-css.ts";

const REMOVED_TAGS = new Set([
  "script",
  "noscript",
  "template",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "param",
  "base",
  "link",
]);

const URL_ATTRIBUTES: Record<string, UrlUsage> = {
  href: "navigation",
  src: "resource",
  poster: "resource",
  action: "resource",
  formaction: "resource",
  cite: "navigation",
  data: "resource",
  "xlink:href": "resource",
  background: "resource",
};

export function sanitizeSnapshotDocument(
  document: SnapshotDocument,
  baseUrl: string,
): void {
  const root = document.documentElement;
  if (root === null) {
    return;
  }

  const removed: SnapshotElement[] = [];
  walkElements(root, (element) => {
    if (shouldRemoveElement(element)) {
      removed.push(element);
    }
  });

  for (const element of removed) {
    detach(element);
  }

  walkElements(root, (element) => {
    sanitizeAttributes(element, baseUrl);
  });

  neutralizeForms(root);
  hideInactiveOverlays(root);
  injectIsolationMeta(document);
  injectFreezeLayout(document);
}

function shouldRemoveElement(element: SnapshotElement): boolean {
  const tag = tagNameOf(element);
  if (tag === "style") {
    return false;
  }

  if (tag === "link") {
    return !isStylesheetLink(element);
  }

  if (tag === "meta") {
    const httpEquiv = element.getAttribute("http-equiv")?.trim().toLowerCase();
    return httpEquiv === "refresh";
  }

  return REMOVED_TAGS.has(tag);
}

export function isStylesheetLink(element: SnapshotElement): boolean {
  if (tagNameOf(element) !== "link") {
    return false;
  }

  const rel = element.getAttribute("rel")?.toLowerCase().split(/\s+/) ?? [];
  return rel.includes("stylesheet") && !rel.includes("alternate");
}

function sanitizeAttributes(element: SnapshotElement, baseUrl: string): void {
  for (const name of attributeNames(element)) {
    const lower = name.toLowerCase();

    if (lower.startsWith("on") || lower === "srcdoc" || lower === "xmlns:xlink") {
      element.removeAttribute(name);
      continue;
    }

    if (lower === "style") {
      const css = element.getAttribute(name);
      if (css === null) {
        continue;
      }
      const sanitized = sanitizeCss(css, baseUrl);
      if (sanitized.trim() === "") {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, sanitized);
      }
      continue;
    }

    if (lower === "srcset") {
      const rewritten = rewriteSrcset(element.getAttribute(name) ?? "", baseUrl);
      if (rewritten === undefined) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, rewritten);
      }
      continue;
    }

    const usage = URL_ATTRIBUTES[lower];
    if (usage === undefined) {
      continue;
    }

    const rewritten = rewritePageUrl(element.getAttribute(name) ?? "", baseUrl, usageFor(element, lower, usage));
    if (rewritten === undefined) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, rewritten);
    }
  }

  if (tagNameOf(element) === "a" || tagNameOf(element) === "area") {
    const rel = element.getAttribute("rel") ?? "";
    const tokens = new Set(rel.toLowerCase().split(/\s+/).filter(Boolean));
    tokens.add("noopener");
    tokens.add("noreferrer");
    element.setAttribute("rel", [...tokens].join(" "));
  }
}

function usageFor(element: SnapshotElement, attribute: string, fallback: UrlUsage): UrlUsage {
  if (attribute === "href" && isStylesheetLink(element)) {
    return "resource";
  }

  return fallback;
}

function neutralizeForms(root: SnapshotElement): void {
  walkElements(root, (element) => {
    const tag = tagNameOf(element);
    if (tag !== "form") {
      return;
    }

    element.removeAttribute("action");
    element.removeAttribute("target");
    element.setAttribute("method", "get");
    element.setAttribute("autocomplete", "off");
  });
}

function hideInactiveOverlays(root: SnapshotElement): void {
  walkElements(root, (element) => {
    if (!isInactiveOverlay(element)) {
      return;
    }

    if (element.getAttribute("hidden") === null) {
      element.setAttribute("hidden", "");
    }
  });
}

function isInactiveOverlay(element: SnapshotElement): boolean {
  const tag = tagNameOf(element);
  if (tag === "dialog" && element.getAttribute("open") === null) {
    return true;
  }

  const ariaHidden = element.getAttribute("aria-hidden") === "true";
  const classes = (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
  const isOffCanvas = classes.includes("e-off-canvas");
  const isDialog = element.getAttribute("role") === "dialog";

  if (isOffCanvas && (ariaHidden || element.getAttribute("inert") !== null)) {
    return true;
  }

  return isDialog && ariaHidden;
}

function injectIsolationMeta(document: SnapshotDocument): void {
  const head = document.head ?? document.documentElement;
  if (head === null) {
    return;
  }

  const meta = document.createElement("meta");
  meta.setAttribute("http-equiv", "Content-Security-Policy");
  meta.setAttribute("content", SNAPSHOT_CSP);
  head.appendChild(meta);
}

function injectFreezeLayout(document: SnapshotDocument): void {
  const head = document.head ?? document.documentElement;
  if (head === null) {
    return;
  }

  if (document.querySelector(`style[${FREEZE_LAYOUT_ATTRIBUTE}]`) !== null) {
    return;
  }

  const style = document.createElement("style");
  style.setAttribute(FREEZE_LAYOUT_ATTRIBUTE, "true");
  style.textContent = FREEZE_DYNAMIC_LAYOUT_CSS;
  head.appendChild(style);
}
