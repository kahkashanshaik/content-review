"use client";

import { coercePagePathDraft } from "../../domain/origin.ts";

type LockedOriginPathFieldProps = {
  originUrl: string;
  path: string;
  id: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  onPathChange?: (value: string) => void;
};

export function LockedOriginPathField({
  originUrl,
  path,
  id,
  disabled = false,
  readOnly = false,
  placeholder = "/path-to-page",
  onPathChange,
}: LockedOriginPathFieldProps) {
  return (
    <div
      className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-slate-200 bg-[#f4f5fb]"
      dir="ltr"
      role="group"
      aria-label="Page address"
    >
      <span className="shrink-0 border-e border-slate-200 px-3 py-2 text-sm text-slate-500" title="Project domain cannot be changed">
        {originUrl}
      </span>
      <label className="sr-only" htmlFor={id}>
        Page path
      </label>
      <input
        id={id}
        dir="ltr"
        value={path}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        {...(readOnly ? { tabIndex: -1, title: "Page path cannot be changed here" } : {})}
        onChange={(event) => {
          if (readOnly || onPathChange === undefined) {
            return;
          }
          onPathChange(coercePagePathDraft(event.target.value));
        }}
        className="min-w-0 flex-1 cursor-text bg-transparent px-2 py-2 text-sm text-slate-900 read-only:cursor-default read-only:text-slate-600 disabled:text-slate-500"
      />
    </div>
  );
}
