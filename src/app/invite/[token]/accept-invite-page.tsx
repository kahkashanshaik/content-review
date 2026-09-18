"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { apiRequest } from "@/client/api";

type InvitePreview = {
  email: string;
  projectName: string;
  projectId: string;
  requiresPassword: boolean;
};

type AcceptInvitePageProps = {
  token: string;
};

export function AcceptInvitePage({ token }: AcceptInvitePageProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const body = await apiRequest<InvitePreview>(`/api/invites/${token}`);
        if (!cancelled) {
          setPreview(body);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "This invite link is invalid.");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      const body = await apiRequest<{ projectId: string }>("/api/invites/accept", {
        method: "POST",
        body: JSON.stringify({
          token,
          password: String(form.get("password") ?? ""),
        }),
      });
      router.push(`/projects/${body.projectId}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The invite could not be accepted.");
      setBusy(false);
    }
  }

  if (error !== undefined && preview === undefined) {
    return (
      <p role="alert" className="text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (preview === undefined) {
    return <p className="text-sm text-slate-600">Loading invite…</p>;
  }

  if (!preview.requiresPassword) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Join {preview.projectName}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {preview.email} already has a Content Review account. Sign in to open this project.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/login" className="font-medium text-[#5b4dff] underline">
            Log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">Join {preview.projectName}</h2>
      <p className="mt-2 text-sm text-slate-600">
        Set a password for {preview.email}. After that you can edit pages and review changes. You cannot delete this
        project.
      </p>
      <form className="mt-6 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            disabled={busy}
            className="rounded-md border border-slate-300 px-3 py-2 text-base font-normal text-slate-900"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[#5b4dff] px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-400"
        >
          {busy ? "Saving…" : "Set password and open project"}
        </button>
        {error === undefined ? null : (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
