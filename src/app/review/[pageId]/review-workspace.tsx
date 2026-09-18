"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiRequest } from "@/client/api";
import { EditableSnapshot } from "@/client/editing/editable-snapshot";
import { ChangeReviewPanel } from "@/client/review/change-review-panel";
import { ChangesMenu, VisualEditorToolbar } from "@/client/review/visual-editor-toolbar";
import { pagePathFromUrl, parseWebsiteUrl } from "@/domain/origin";
import type { ContentItem, PageState } from "@/domain/types";
import type { ReviewPageData } from "@/application/use-cases/load-review";

type ReviewWorkspaceProps = {
  pageId: string;
};

type ReviewState =
  | { status: "loading" }
  | { status: "ready"; data: ReviewPageData }
  | { status: "error"; message: string };

export function ReviewWorkspace({ pageId }: ReviewWorkspaceProps) {
  const [state, setState] = useState<ReviewState>({ status: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [decidingId, setDecidingId] = useState<string | undefined>(undefined);
  const [actionError, setActionError] = useState<string | undefined>(undefined);
  const [linkCopied, setLinkCopied] = useState(false);
  const [zoom, setZoom] = useState(100);
  const stateKeyRef = useRef<string | undefined>(undefined);

  const load = useCallback(
    async (stateKey?: string): Promise<void> => {
      const key = stateKey ?? stateKeyRef.current;
      const path =
        key === undefined
          ? `/api/pages/${pageId}/review`
          : `/api/pages/${pageId}/review?stateKey=${encodeURIComponent(key)}`;
      try {
        const data = await apiRequest<ReviewPageData>(path);
        stateKeyRef.current = data.state.key;
        setState({ status: "ready", data });
      } catch (caught) {
        setState({
          status: "error",
          message: caught instanceof Error ? caught.message : "The review could not be loaded.",
        });
      }
    },
    [pageId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onItemsChange = useCallback(
    (items: ContentItem[]) => {
      setState((current) => {
        if (current.status !== "ready") {
          return current;
        }

        return {
          status: "ready",
          data: { ...current.data, items },
        };
      });
      void load();
    },
    [load],
  );

  const onSubmit = useCallback(async () => {
    setSubmitting(true);
    setActionError(undefined);
    try {
      await apiRequest(`/api/pages/${pageId}/revisions`, { method: "POST" });
      await load();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "The revision could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }, [load, pageId]);

  const onDecide = useCallback(
    async (changeId: string, decision: "accepted" | "rejected") => {
      setDecidingId(changeId);
      setActionError(undefined);
      try {
        await apiRequest(`/api/changes/${changeId}/review`, {
          method: "POST",
          body: JSON.stringify({ decision }),
        });
        await load();
      } catch (caught) {
        setActionError(caught instanceof Error ? caught.message : "The decision could not be saved.");
      } finally {
        setDecidingId(undefined);
      }
    },
    [load],
  );

  if (state.status === "loading") {
    return <p className="p-6 text-sm text-slate-600">Loading saved snapshot…</p>;
  }

  if (state.status === "error") {
    return (
      <p role="alert" className="p-6 text-sm text-red-700">
        {state.message}
      </p>
    );
  }

  const { data } = state;
  const title = data.page.title ?? data.project.name;
  const notes = data.page.unsupportedDynamic ?? [];
  const draftCount = data.reviewChanges.filter(
    (entry) => entry.change.status === "pending" && !entry.submitted,
  ).length;

  return (
    <div className="flex h-dvh flex-col bg-white">
      <VisualEditorToolbar
        projectName={data.project.name}
        projectHref={`/projects/${data.project.id}`}
        originUrl={data.project.originUrl}
        path={sourcePath(data.page.sourceUrl)}
        submitting={submitting}
        canSubmit={draftCount > 0}
        linkCopied={linkCopied}
        onCopyLink={() => {
          void navigator.clipboard.writeText(window.location.href).then(
            () => {
              setLinkCopied(true);
              window.setTimeout(() => {
                setLinkCopied(false);
              }, 2000);
            },
            () => {
              setActionError("The review link could not be copied.");
            },
          );
        }}
        onSubmit={() => {
          void onSubmit();
        }}
        zoom={zoom}
        onZoomChange={setZoom}
        changes={
          <ChangesMenu count={data.reviewChanges.length}>
            <ChangeReviewPanel
              entries={data.reviewChanges}
              revisions={data.revisions}
              {...(decidingId === undefined ? {} : { decidingId })}
              {...(actionError === undefined ? {} : { error: actionError })}
              onAccept={(changeId) => {
                void onDecide(changeId, "accepted");
              }}
              onReject={(changeId) => {
                void onDecide(changeId, "rejected");
              }}
            />
          </ChangesMenu>
        }
        states={
          <StateSwitcher
            states={data.states}
            currentKey={data.state.key}
            onSelect={(key) => {
              void load(key);
            }}
          />
        }
      />
      {actionError === undefined ? null : (
        <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {actionError}
        </p>
      )}
      {notes.length === 0 ? null : (
        <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
      <EditableSnapshot
        key={data.state.id}
        pageId={pageId}
        sanitizedHtml={data.sanitizedHtml}
        title={title}
        items={data.items}
        zoom={zoom}
        onItemsChange={onItemsChange}
      />
    </div>
  );
}

function sourcePath(sourceUrl: string): string {
  const parsed = parseWebsiteUrl(sourceUrl);
  return parsed.ok ? pagePathFromUrl(parsed.value) : "/";
}

function StateSwitcher({
  states,
  currentKey,
  onSelect,
}: {
  states: PageState[];
  currentKey: string;
  onSelect: (key: string) => void;
}) {
  if (states.length < 2) {
    return null;
  }

  return (
    <label className="flex items-center text-sm text-slate-600">
      <span className="sr-only">Page state</span>
      <select
        value={currentKey}
        onChange={(event) => {
          onSelect(event.target.value);
        }}
        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
      >
        {states.map((entry) => (
          <option key={entry.id} value={entry.key}>
            {entry.label ?? entry.key}
          </option>
        ))}
      </select>
    </label>
  );
}
