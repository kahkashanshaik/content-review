"use client";

import { useEffect, useRef, type ChangeEvent } from "react";

import { segmentMixedText } from "../../domain/bidi.ts";
import type { ContentItem } from "../../domain/types.ts";

type EditSidebarProps = {
  item: ContentItem;
  draft: string;
  saving: boolean;
  error?: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function EditSidebar({
  item,
  draft,
  saving,
  error,
  hasPrevious,
  hasNext,
  onDraftChange,
  onSave,
  onCancel,
  onPrevious,
  onNext,
}: EditSidebarProps) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const direction = item.direction === "rtl" || item.direction === "ltr" ? item.direction : "auto";

  useEffect(() => {
    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, [item.id]);

  return (
    <aside
      className="flex w-[22rem] shrink-0 flex-col border-e border-slate-200 bg-white"
      aria-label="Edit content"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!hasPrevious || saving}
            className="rounded-md px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:text-slate-300"
            aria-label="Previous text"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext || saving}
            className="rounded-md px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:text-slate-300"
            aria-label="Next text"
          >
            ›
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          Close
        </button>
      </div>
      <div className="grid gap-3 overflow-auto p-4">
        <OriginalCard
          text={item.originalText}
          direction={direction}
          {...(item.language === undefined ? {} : { language: item.language })}
        />
        <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Edit content
          <textarea
            ref={fieldRef}
            value={draft}
            dir={direction}
            {...(item.language === undefined ? {} : { lang: item.language })}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
              onDraftChange(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onCancel();
              }
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                onSave();
              }
            }}
            rows={5}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-900"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || draft === item.currentText}
            className="rounded-md bg-[#5b4dff] px-3 py-1.5 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {error === undefined ? null : (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </aside>
  );
}

function OriginalCard({
  text,
  direction,
  language,
}: {
  text: string;
  direction: "ltr" | "rtl" | "auto";
  language?: string;
}) {
  const segments = segmentMixedText(text, direction);
  const value = segments.map((segment, index) =>
    segment.dir === undefined ? (
      segment.text
    ) : (
      <bdi key={index} dir={segment.dir}>
        {segment.text}
      </bdi>
    ),
  );

  return (
    <p
      className="rounded-2xl bg-[#f3f4f8] px-3 py-3 text-sm text-slate-800"
      dir={direction}
      {...(language === undefined ? {} : { lang: language })}
    >
      {value}
    </p>
  );
}
