import { SnapshotPreviewPanel } from "./preview-panel";

export default function SnapshotPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Snapshot isolation</h1>
      <p className="mt-3 max-w-2xl text-stone-700">
        Crawled HTML is sanitized and shown in a sandboxed frame. Source scripts, event
        handlers, and unsafe URLs are removed before rendering.
      </p>

      <section
        data-testid="app-chrome"
        className="mt-8 rounded-lg border border-stone-300 bg-white p-4 text-stone-900"
        aria-labelledby="chrome-heading"
      >
        <h2 id="chrome-heading" className="text-lg font-medium">
          Application chrome
        </h2>
        <p className="mt-2 text-sm text-stone-700">
          This panel belongs to the review app. Snapshot CSS must not turn it lime or magenta.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="snapshot-heading">
        <h2 id="snapshot-heading" className="sr-only">
          Isolated snapshot
        </h2>
        <SnapshotPreviewPanel />
      </section>
    </main>
  );
}
