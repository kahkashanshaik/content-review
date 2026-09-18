"use client";

import { DirectionalText } from "@/client/editing/directional-text";
import type { ReviewChangeEntry } from "@/application/use-cases/load-review";
import type { Revision } from "@/domain/types";

type ChangeReviewPanelProps = {
  entries: ReviewChangeEntry[];
  revisions: Revision[];
  decidingId?: string;
  error?: string;
  onAccept: (changeId: string) => void;
  onReject: (changeId: string) => void;
};

export function ChangeReviewPanel({
  entries,
  revisions,
  decidingId,
  error,
  onAccept,
  onReject,
}: ChangeReviewPanelProps) {
  const draftCount = entries.filter(
    (entry) => entry.change.status === "pending" && !entry.submitted,
  ).length;
  const submittedPending = entries.filter(
    (entry) => entry.change.status === "pending" && entry.submitted,
  ).length;

  return (
    <section aria-labelledby="changes-heading">
      <h2 id="changes-heading" className="text-sm font-semibold text-stone-900">
        Changes
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        {draftCount} draft{draftCount === 1 ? "" : "s"} to submit. {submittedPending} submitted
        and waiting. {revisions.length} revision{revisions.length === 1 ? "" : "s"}.
      </p>

      {error === undefined ? null : (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">No edits yet. Click snapshot text to propose a change.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {entries.map((entry) => (
            <li key={entry.change.id}>
              <ChangeCard
                entry={entry}
                deciding={decidingId === entry.change.id}
                onAccept={onAccept}
                onReject={onReject}
              />
            </li>
          ))}
        </ul>
      )}

      {revisions.length === 0 ? null : (
        <ol className="mt-4 list-decimal space-y-1 ps-5 text-sm text-stone-700">
          {revisions.map((revision, index) => (
            <li key={revision.id}>
              Revision {index + 1}: {revision.changeIds.length} change
              {revision.changeIds.length === 1 ? "" : "s"} submitted {formatTimestamp(revision.createdAt)}.
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ChangeCard({
  entry,
  deciding,
  onAccept,
  onReject,
}: {
  entry: ReviewChangeEntry;
  deciding: boolean;
  onAccept: (changeId: string) => void;
  onReject: (changeId: string) => void;
}) {
  const status = statusLabel(entry);
  const canDecide = entry.change.status === "pending" && entry.submitted;
  const stateName = entry.stateLabel ?? entry.stateKey;

  return (
    <article className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-900">
          {entry.item.elementType} · {stateName}
        </p>
        <p className="text-sm text-stone-700">{status}</p>
      </div>
      <DirectionalText
        label="Original"
        text={entry.change.originalValue}
        {...(entry.item.direction === undefined ? {} : { direction: entry.item.direction })}
        {...(entry.item.language === undefined ? {} : { language: entry.item.language })}
      />
      <DirectionalText
        label="Proposed"
        text={entry.change.newValue}
        {...(entry.item.direction === undefined ? {} : { direction: entry.item.direction })}
        {...(entry.item.language === undefined ? {} : { language: entry.item.language })}
      />
      {canDecide ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={deciding}
            onClick={() => {
              onAccept(entry.change.id);
            }}
            className="rounded bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:bg-stone-400"
          >
            {deciding ? "Saving…" : "Accept"}
          </button>
          <button
            type="button"
            disabled={deciding}
            onClick={() => {
              onReject(entry.change.id);
            }}
            className="rounded border border-stone-400 bg-white px-3 py-1.5 text-sm font-medium text-stone-900"
          >
            Reject
          </button>
        </div>
      ) : null}
    </article>
  );
}

function statusLabel(entry: ReviewChangeEntry): string {
  if (entry.change.status === "accepted") {
    return "Accepted";
  }
  if (entry.change.status === "rejected") {
    return "Rejected";
  }
  return entry.submitted ? "Submitted" : "Draft";
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}
