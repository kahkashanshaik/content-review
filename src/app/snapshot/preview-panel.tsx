"use client";

import { useEffect, useState } from "react";

import { IsolatedSnapshot } from "@/client/snapshot/isolated-snapshot";

type PreviewState =
  | { status: "loading" }
  | { status: "ready"; sanitizedHtml: string; title?: string }
  | { status: "error"; message: string };

export function SnapshotPreviewPanel() {
  const [state, setState] = useState<PreviewState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const response = await fetch("/api/snapshot/preview");
        const body: unknown = await response.json();
        if (!response.ok) {
          throw new Error(readErrorMessage(body));
        }

        const sanitizedHtml = readSanitizedHtml(body);
        const title = readTitle(body);
        if (cancelled) {
          return;
        }

        setState(
          title === undefined
            ? { status: "ready", sanitizedHtml }
            : { status: "ready", sanitizedHtml, title },
        );
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "The snapshot could not be loaded.",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <p className="text-sm text-stone-600">Loading isolated snapshot…</p>;
  }

  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-red-800">
        {state.message}
      </p>
    );
  }

  if (state.title === undefined) {
    return <IsolatedSnapshot sanitizedHtml={state.sanitizedHtml} />;
  }

  return <IsolatedSnapshot sanitizedHtml={state.sanitizedHtml} title={state.title} />;
}

function readSanitizedHtml(body: unknown): string {
  if (typeof body !== "object" || body === null || !("sanitizedHtml" in body)) {
    throw new Error("The snapshot response was missing sanitized HTML.");
  }

  if (typeof body.sanitizedHtml !== "string" || body.sanitizedHtml.length === 0) {
    throw new Error("The snapshot response was missing sanitized HTML.");
  }

  return body.sanitizedHtml;
}

function readTitle(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("title" in body)) {
    return undefined;
  }

  return typeof body.title === "string" ? body.title : undefined;
}

function readErrorMessage(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "message" in body.error &&
    typeof body.error.message === "string"
  ) {
    return body.error.message;
  }

  return "The snapshot preview failed.";
}
