import {
  CONTENT_EDITED_ATTRIBUTE,
  CONTENT_EDITING_ATTRIBUTE,
  CONTENT_ID_ATTRIBUTE,
} from "../../domain/content-attributes.ts";
import { segmentMixedText } from "../../domain/bidi.ts";
import { normalizeEditedText } from "../../application/use-cases/save-content-edit.ts";
import type { ContentItem, TextDirection } from "../../domain/types.ts";

export type SnapshotNode = {
  textContent: string | null;
  tagName?: string;
  nodeType?: number;
  childNodes?: ArrayLike<VisibleTextNode>;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  appendChild?(child: unknown): unknown;
  ownerDocument?: {
    createElement(tag: string): SnapshotNode;
    createTextNode(data: string): { textContent: string | null };
  };
};

export type VisibleTextNode = {
  textContent: string | null;
  tagName?: string;
  nodeType?: number;
  childNodes?: ArrayLike<VisibleTextNode>;
};

export type SnapshotRoot = {
  querySelector(selector: string): SnapshotNode | null;
};

export const SNAPSHOT_EDITOR_STYLES = `[data-content-id] {
  cursor: pointer;
  outline: 2px solid transparent;
  outline-offset: 6px;
  unicode-bidi: isolate;
}
[data-content-id]:hover,
[data-content-id]:focus-visible {
  outline-color: rgba(91, 77, 255, 0.45);
}
[data-content-edited="true"] {
  outline-color: #d97706;
}
[data-content-editing="true"] {
  outline-color: #5b4dff;
}`;

export function isSnapshotElement(value: unknown): value is SnapshotNode & {
  closest(selector: string): SnapshotNode | null;
  focus(): void;
  nodeType: number;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.nodeType === 1 &&
    typeof record.getAttribute === "function" &&
    typeof record.setAttribute === "function" &&
    typeof record.closest === "function"
  );
}

export function closestSnapshotElement(
  value: unknown,
): (SnapshotNode & { closest(selector: string): SnapshotNode | null }) | undefined {
  if (isSnapshotElement(value)) {
    return value;
  }

  if (typeof value === "object" && value !== null && "parentElement" in value) {
    const parent = (value as { parentElement: unknown }).parentElement;
    if (isSnapshotElement(parent)) {
      return parent;
    }
  }

  return undefined;
}

export function contentSelector(contentId: string): string {
  return `[${CONTENT_ID_ATTRIBUTE}="${cssEscape(contentId)}"]`;
}

export function applyCurrentText(root: SnapshotRoot, items: readonly ContentItem[]): void {
  for (const item of items) {
    const node = root.querySelector(contentSelector(item.id));
    if (node === null) {
      continue;
    }

    applyDirectionMetadata(node, item);

    if (item.currentText === item.originalText) {
      node.removeAttribute(CONTENT_EDITED_ATTRIBUTE);
      continue;
    }

    renderMixedText(node, item.currentText, item.direction);
    node.setAttribute(CONTENT_EDITED_ATTRIBUTE, "true");
  }
}

export function renderMixedText(
  node: SnapshotNode,
  text: string,
  direction: TextDirection | undefined,
): void {
  applyDirection(node, direction);
  const document = node.ownerDocument;
  if (document === undefined || node.appendChild === undefined) {
    node.textContent = text;
    return;
  }

  node.textContent = "";
  for (const segment of segmentMixedText(text, direction)) {
    if (segment.dir === undefined) {
      node.appendChild(document.createTextNode(segment.text));
      continue;
    }

    const isolate = document.createElement("bdi");
    isolate.setAttribute("dir", segment.dir);
    isolate.textContent = segment.text;
    node.appendChild(isolate);
  }
}

export function applyDirectionMetadata(node: SnapshotNode, item: ContentItem): void {
  applyDirection(node, item.direction);
  if (item.language !== undefined && !node.getAttribute("lang")) {
    node.setAttribute("lang", item.language);
  }
}

export function readEditedText(node: SnapshotNode): string {
  return readVisibleText(node);
}

export function readVisibleText(node: VisibleTextNode): string {
  return normalizeEditedText(collectVisibleText(node));
}

export function hydrateUneditedText(node: VisibleTextNode, item: ContentItem): ContentItem {
  if (item.currentText !== item.originalText) {
    return item;
  }

  const fromDom = readVisibleText(node);
  if (fromDom.length === 0 || fromDom === item.originalText) {
    return item;
  }

  return { ...item, originalText: fromDom, currentText: fromDom };
}

const BREAK_TAGS = new Set(["br", "wbr", "hr"]);

function collectVisibleText(node: VisibleTextNode): string {
  const tag = node.tagName?.toLowerCase();
  if (tag !== undefined && BREAK_TAGS.has(tag)) {
    return " ";
  }

  if (node.childNodes !== undefined && node.childNodes.length > 0) {
    let text = "";
    for (let i = 0; i < node.childNodes.length; i += 1) {
      const child = node.childNodes[i];
      if (child !== undefined) {
        text += collectVisibleText(child);
      }
    }
    return text;
  }

  return node.textContent ?? "";
}

export function setEditing(node: SnapshotNode, editing: boolean): void {
  if (editing) {
    node.setAttribute(CONTENT_EDITING_ATTRIBUTE, "true");
    return;
  }

  node.removeAttribute(CONTENT_EDITING_ATTRIBUTE);
}

export function prepareMappedElement(node: SnapshotNode, item: ContentItem): void {
  applyDirectionMetadata(node, item);
  node.setAttribute("tabindex", "0");
  node.setAttribute("data-editable", "true");
  node.setAttribute("aria-label", `Edit ${item.elementType}: ${item.currentText}`);
}

function applyDirection(node: SnapshotNode, direction: TextDirection | undefined): void {
  if (direction === undefined || direction === "auto") {
    return;
  }

  if (!node.getAttribute("dir")) {
    node.setAttribute("dir", direction);
  }
}

function cssEscape(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
