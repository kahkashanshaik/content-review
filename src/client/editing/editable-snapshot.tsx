"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ContentItem } from "@/domain/types";
import { CONTENT_ID_ATTRIBUTE } from "@/domain/content-attributes";
import { apiRequest } from "@/client/api";
import { EditSidebar } from "@/client/review/edit-sidebar";
import { SnapshotFrame } from "@/client/snapshot/snapshot-frame";
import {
  applyCurrentText,
  applyDirectionMetadata,
  closestSnapshotElement,
  contentSelector,
  hydrateUneditedText,
  isSnapshotElement,
  prepareMappedElement,
  renderMixedText,
  setEditing,
  SNAPSHOT_EDITOR_STYLES,
} from "./snapshot-dom";

type EditableSnapshotProps = {
  pageId: string;
  sanitizedHtml: string;
  title?: string;
  items: ContentItem[];
  zoom: number;
  onItemsChange: (items: ContentItem[]) => void;
};

export function EditableSnapshot({
  pageId,
  sanitizedHtml,
  title,
  items,
  zoom,
  onItemsChange,
}: EditableSnapshotProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const itemsRef = useRef(items);
  const editingIdRef = useRef<string | undefined>(undefined);
  const draftRef = useRef("");
  const clonesRef = useRef(
    new Map<string, { parent: { replaceChild(next: unknown, old: unknown): void }; clone: unknown }>(),
  );
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [editorItem, setEditorItem] = useState<ContentItem | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [pencil, setPencil] = useState<{ top: number; left: number } | undefined>(undefined);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const editingItem =
    editorItem !== undefined && editorItem.id === editingId
      ? editorItem
      : items.find((item) => item.id === editingId);
  const editingIndex = items.findIndex((item) => item.id === editingId);

  const snapshotDocument = useCallback((): Document | undefined => {
    return iframeRef.current?.contentDocument ?? undefined;
  }, []);

  const updatePencil = useCallback(() => {
    const iframe = iframeRef.current;
    const currentId = editingIdRef.current;
    const doc = iframe?.contentDocument;
    if (iframe === undefined || currentId === undefined || doc === undefined || doc === null) {
      setPencil(undefined);
      return;
    }

    const node = doc.querySelector(contentSelector(currentId));
    if (!isSnapshotElement(node) || !("getBoundingClientRect" in node)) {
      setPencil(undefined);
      return;
    }

    const rect = (node as { getBoundingClientRect(): DOMRect }).getBoundingClientRect();
    setPencil({
      top: rect.top,
      left: rect.left + rect.width / 2,
    });
  }, []);

  const previewDraft = useCallback(
    (contentId: string, text: string) => {
      const doc = snapshotDocument();
      const node = doc?.querySelector(contentSelector(contentId));
      const item = itemsRef.current.find((entry) => entry.id === contentId);
      if (!isSnapshotElement(node) || item === undefined) {
        return;
      }

      renderMixedText(node, text, item.direction);
      updatePencil();
    },
    [snapshotDocument, updatePencil],
  );

  const stopEditing = useCallback(
    (restore: boolean) => {
      const doc = snapshotDocument();
      const currentId = editingIdRef.current;
      if (doc === undefined || currentId === undefined) {
        setEditingId(undefined);
        setEditorItem(undefined);
        setPencil(undefined);
        return;
      }

      const node = doc.querySelector(contentSelector(currentId));
      if (isSnapshotElement(node)) {
        const item = itemsRef.current.find((entry) => entry.id === currentId);
        setEditing(node, false);
        if (restore && item !== undefined) {
          restoreNode(currentId, node, item, clonesRef.current);
        } else {
          clonesRef.current.delete(currentId);
        }
      }

      setEditingId(undefined);
      setEditorItem(undefined);
      setDraft("");
      setPencil(undefined);
    },
    [snapshotDocument],
  );

  const saveEditing = useCallback(async (): Promise<boolean> => {
    const currentId = editingIdRef.current;
    if (currentId === undefined) {
      return false;
    }

    const item =
      editorItem !== undefined && editorItem.id === currentId
        ? editorItem
        : itemsRef.current.find((entry) => entry.id === currentId);
    const newText = draftRef.current;
    if (item === undefined || newText === item.currentText) {
      return true;
    }

    setSaving(true);
    setError(undefined);

    try {
      const result = await apiRequest<{ item: ContentItem }>(`/api/pages/${pageId}/edits`, {
        method: "POST",
        body: JSON.stringify({ contentItemId: currentId, newText }),
      });
      const doc = snapshotDocument();
      const node = doc?.querySelector(contentSelector(currentId));
      if (isSnapshotElement(node)) {
        renderMixedText(node, result.item.currentText, result.item.direction);
        setEditing(node, true);
      }
      clonesRef.current.delete(currentId);
      setEditorItem(result.item);
      onItemsChange(itemsRef.current.map((entry) => (entry.id === currentId ? result.item : entry)));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The edit could not be saved.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [editorItem, onItemsChange, pageId, snapshotDocument]);

  const startEditing = useCallback(
    (contentId: string) => {
      if (editingIdRef.current === contentId) {
        return;
      }

      const open = (): void => {
        const doc = snapshotDocument();
        if (doc === undefined) {
          return;
        }

        const item = itemsRef.current.find((entry) => entry.id === contentId);
        const node = doc.querySelector(contentSelector(contentId));
        if (item === undefined || !isSnapshotElement(node)) {
          return;
        }

        const editorItem = hydrateUneditedText(node, item);
        if (editorItem.originalText !== item.originalText || editorItem.currentText !== item.currentText) {
          itemsRef.current = itemsRef.current.map((entry) =>
            entry.id === contentId ? editorItem : entry,
          );
        }

        snapshotClone(contentId, node, clonesRef.current);
        applyDirectionMetadata(node, editorItem);
        setEditing(node, true);
        setEditorItem(editorItem);
        setEditingId(contentId);
        setDraft(editorItem.currentText);
        draftRef.current = editorItem.currentText;
        setError(undefined);
        window.setTimeout(updatePencil, 0);
        if ("scrollIntoView" in node && typeof node.scrollIntoView === "function") {
          node.scrollIntoView({ block: "center", inline: "nearest" });
        }
      };

      if (editingIdRef.current === undefined) {
        open();
        return;
      }

      void saveEditing().then((ok) => {
        if (!ok) {
          return;
        }
        stopEditing(false);
        open();
      });
    },
    [saveEditing, snapshotDocument, stopEditing, updatePencil],
  );

  const prepareFrame = useCallback(() => {
    const doc = snapshotDocument();
    if (doc === undefined) {
      return;
    }

    injectEditorStyles(doc);
    applyCurrentText(doc, itemsRef.current);

    for (const item of itemsRef.current) {
      const node = doc.querySelector(contentSelector(item.id));
      if (isSnapshotElement(node)) {
        prepareMappedElement(node, item);
      }
    }

    doc.addEventListener("click", (event) => {
      const target = closestSnapshotElement(event.target);
      if (target === undefined) {
        return;
      }

      event.preventDefault();
      const mapped = target.closest(`[${CONTENT_ID_ATTRIBUTE}]`);
      if (isSnapshotElement(mapped)) {
        const contentId = mapped.getAttribute(CONTENT_ID_ATTRIBUTE);
        if (contentId) {
          startEditing(contentId);
        }
      }
    });

    doc.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const keyTarget = closestSnapshotElement(event.target);
        const mapped = keyTarget?.closest(`[${CONTENT_ID_ATTRIBUTE}]`);
        const contentId = isSnapshotElement(mapped)
          ? mapped.getAttribute(CONTENT_ID_ATTRIBUTE)
          : undefined;
        if (contentId) {
          event.preventDefault();
          startEditing(contentId);
        }
      }
      if (event.key === "Escape") {
        event.preventDefault();
        stopEditing(true);
      }
    });

    doc.addEventListener("scroll", updatePencil, true);
  }, [snapshotDocument, startEditing, stopEditing, updatePencil]);

  useEffect(() => {
    const doc = snapshotDocument();
    if (doc !== undefined) {
      applyCurrentText(doc, items);
      const currentId = editingIdRef.current;
      if (currentId !== undefined) {
        const node = doc.querySelector(contentSelector(currentId));
        if (isSnapshotElement(node)) {
          setEditing(node, true);
        }
      }
      updatePencil();
    }
  }, [items, snapshotDocument, updatePencil]);

  const scale = zoom / 100;

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {editingItem === undefined ? null : (
        <EditSidebar
          item={editingItem}
          draft={draft}
          saving={saving}
          hasPrevious={editingIndex > 0}
          hasNext={editingIndex >= 0 && editingIndex < items.length - 1}
          onDraftChange={(value) => {
            setDraft(value);
            draftRef.current = value;
            if (editingItem !== undefined) {
              previewDraft(editingItem.id, value);
            }
          }}
          onSave={() => {
            void saveEditing();
          }}
          onCancel={() => {
            stopEditing(true);
          }}
          onPrevious={() => {
            const previous = items[editingIndex - 1];
            if (previous !== undefined) {
              startEditing(previous.id);
            }
          }}
          onNext={() => {
            const next = items[editingIndex + 1];
            if (next !== undefined) {
              startEditing(next.id);
            }
          }}
          {...(error === undefined ? {} : { error })}
        />
      )}
      <div className="relative min-w-0 flex-1 overflow-auto bg-[#eef0f6]">
        <div
          className="relative h-full origin-top-left"
          style={{
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
            transform: `scale(${scale})`,
          }}
        >
          {title === undefined ? (
            <SnapshotFrame
              sanitizedHtml={sanitizedHtml}
              sandbox="allow-same-origin"
              iframeRef={iframeRef}
              onLoad={prepareFrame}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <SnapshotFrame
              sanitizedHtml={sanitizedHtml}
              title={title}
              sandbox="allow-same-origin"
              iframeRef={iframeRef}
              onLoad={prepareFrame}
              className="h-full w-full border-0 bg-white"
            />
          )}
          {pencil === undefined ? null : (
            <div
              className="pointer-events-none absolute z-10 flex size-8 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-white text-[#5b4dff] shadow"
              style={{ top: pencil.top, left: pencil.left }}
              aria-hidden="true"
            >
              ✎
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function injectEditorStyles(doc: Document): void {
  if (doc.querySelector("style[data-snapshot-editor]")) {
    return;
  }

  const style = doc.createElement("style");
  style.setAttribute("data-snapshot-editor", "true");
  style.textContent = SNAPSHOT_EDITOR_STYLES;
  (doc.head ?? doc.documentElement).appendChild(style);
}

function snapshotClone(
  contentId: string,
  node: object,
  clones: Map<string, { parent: { replaceChild(next: unknown, old: unknown): void }; clone: unknown }>,
): void {
  if (!("cloneNode" in node) || !("parentNode" in node)) {
    return;
  }

  const parent = (node as { parentNode: { replaceChild(next: unknown, old: unknown): void } | null }).parentNode;
  if (parent === null) {
    return;
  }

  clones.set(contentId, {
    parent,
    clone: (node as { cloneNode(deep: boolean): unknown }).cloneNode(true),
  });
}

function restoreNode(
  contentId: string,
  node: Parameters<typeof renderMixedText>[0],
  item: ContentItem,
  clones: Map<string, { parent: { replaceChild(next: unknown, old: unknown): void }; clone: unknown }>,
): void {
  const stored = clones.get(contentId);
  if (stored !== undefined && item.currentText === item.originalText) {
    stored.parent.replaceChild(stored.clone, node);
    clones.delete(contentId);
    return;
  }

  renderMixedText(node, item.currentText, item.direction);
  clones.delete(contentId);
}
