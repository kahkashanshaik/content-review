"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { apiRequest } from "@/client/api";

export function NewProjectForm() {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(undefined);

    try {
      const result = await apiRequest<{ project: { id: string }; page?: { id: string } }>(
        "/api/projects",
        {
          method: "POST",
          body: JSON.stringify({
            name: String(form.get("name") ?? ""),
            originUrl: String(form.get("originUrl") ?? ""),
          }),
        },
      );
      router.push(result.page === undefined ? `/projects/${result.project.id}` : `/review/${result.page.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The project could not be created.");
      setBusy(false);
    }
  }

  return (
    <form className="mt-6 grid max-w-xl gap-4" onSubmit={(event) => void onSubmit(event)}>
      <label className="grid gap-1 text-sm font-medium">
        Project name
        <input
          name="name"
          required
          disabled={busy}
          placeholder="StandardTouch"
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Website URL
        <input
          name="originUrl"
          type="url"
          required
          disabled={busy}
          placeholder="https://standardtouch.com"
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        />
      </label>
      <p className="text-sm text-slate-600">
        Later pages only need a path such as <span className="font-medium">/about</span>. The domain cannot be
        changed after the project is created.
      </p>
      <button
        type="submit"
        disabled={busy}
        className="w-fit rounded-md bg-[#5b4dff] px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
      >
        {busy ? "Crawling website…" : "Create project"}
      </button>
      {error === undefined ? null : (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
