import { parseHTML } from "linkedom";

import type { HtmlElement } from "../extraction/dom.ts";

import { CONTENT_ID_ATTRIBUTE, CONTENT_TYPE_ATTRIBUTE } from "../../domain/content-attributes.ts";

export { CONTENT_ID_ATTRIBUTE, CONTENT_TYPE_ATTRIBUTE };

export const SNAPSHOT_CSP =
  "default-src 'none'; img-src http: https: data:; style-src 'unsafe-inline'; font-src http: https: data:; media-src http: https:; script-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";

export type SnapshotElement = HtmlElement & {
  removeAttribute(name: string): void;
  setAttribute(name: string, value: string): void;
  getAttributeNames(): ArrayLike<string>;
  querySelector(selector: string): SnapshotElement | null;
  appendChild(node: SnapshotElement): SnapshotElement;
  parentNode: { removeChild(node: SnapshotElement): void } | null;
  outerHTML: string;
  textContent: string | null;
};

export type SnapshotDocument = {
  documentElement: SnapshotElement | null;
  head: SnapshotElement | null;
  body: SnapshotElement | null;
  title: string;
  createElement(tag: string): SnapshotElement;
  querySelector(selector: string): SnapshotElement | null;
};

export function parseSnapshotDocument(html: string): SnapshotDocument {
  const { document } = parseHTML(html);
  return document as unknown as SnapshotDocument;
}

export function serializeSnapshotDocument(document: SnapshotDocument): string {
  const root = document.documentElement;
  if (root === null) {
    return "<!DOCTYPE html><html><head></head><body></body></html>";
  }

  return `<!DOCTYPE html>${root.outerHTML}`;
}

export function walkElements(
  root: SnapshotElement,
  visit: (element: SnapshotElement) => void,
): void {
  visit(root);
  for (let i = 0; i < root.children.length; i += 1) {
    const child = root.children[i];
    if (child !== undefined) {
      walkElements(child as SnapshotElement, visit);
    }
  }
}

export function detach(element: SnapshotElement): void {
  element.parentNode?.removeChild(element);
}

export function attributeNames(element: SnapshotElement): string[] {
  const names = element.getAttributeNames();
  const result: string[] = [];
  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    if (typeof name === "string") {
      result.push(name);
    }
  }
  return result;
}
