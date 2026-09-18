"use client";

import { LockedOriginPathField } from "@/client/origin/locked-origin-path-field";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type VisualEditorToolbarProps = {
  projectName: string;
  projectHref: string;
  originUrl: string;
  path: string;
  submitting: boolean;
  canSubmit: boolean;
  linkCopied: boolean;
  onCopyLink: () => void;
  onSubmit: () => void;
  zoom: number;
  onZoomChange: (value: number) => void;
  changes?: ReactNode;
  states?: ReactNode;
};

export function VisualEditorToolbar({
  projectName,
  projectHref,
  originUrl,
  path,
  submitting,
  canSubmit,
  linkCopied,
  onCopyLink,
  onSubmit,
  zoom,
  onZoomChange,
  changes,
  states,
}: VisualEditorToolbarProps) {
  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3">
      <Link
        href={projectHref}
        className="max-w-48 truncate rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
      >
        {projectName}
      </Link>
      <div className="flex min-w-0 max-w-2xl flex-1 justify-center">
        <LockedOriginPathField id="visual-editor-url" originUrl={originUrl} path={path} readOnly />
      </div>
      {states}
      {changes}
      <label className="flex items-center gap-1 text-sm text-slate-600">
        <span className="sr-only">Zoom</span>
        <select
          value={String(zoom)}
          onChange={(event) => {
            onZoomChange(Number(event.target.value));
          }}
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="50">50%</option>
          <option value="80">80%</option>
          <option value="100">100%</option>
          <option value="125">125%</option>
        </select>
      </label>
      <button
        type="button"
        onClick={onCopyLink}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
      >
        {linkCopied ? "Link copied" : "Copy preview link"}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !canSubmit}
        className="h-9 rounded-md bg-[#5b4dff] px-4 text-sm font-semibold text-white disabled:bg-slate-400"
      >
        {submitting ? "Submitting…" : "Submit for review"}
      </button>
    </header>
  );
}

type ChangesMenuProps = {
  children: ReactNode;
  count: number;
};

export function ChangesMenu({ children, count }: ChangesMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="visual-editor-changes"
        onClick={() => {
          setOpen((current) => !current);
        }}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
      >
        Changes{count > 0 ? ` (${count})` : ""}
      </button>
      {open ? (
        <div
          id="visual-editor-changes"
          className="absolute end-0 top-11 z-30 max-h-[min(70vh,32rem)] w-[min(28rem,calc(100vw-2rem))] overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
