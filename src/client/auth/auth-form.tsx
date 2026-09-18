"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { apiRequest } from "@/client/api";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(undefined);

    try {
      await apiRequest(register ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      router.push("/projects");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Email address
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={busy}
          className="rounded-md border border-slate-300 px-3 py-2 text-base font-normal text-slate-900"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={register ? "new-password" : "current-password"}
          disabled={busy}
          className="rounded-md border border-slate-300 px-3 py-2 text-base font-normal text-slate-900"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-[#5b4dff] px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-400"
      >
        {busy ? "Working…" : register ? "Create account" : "Log in"}
      </button>
      {error === undefined ? null : (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
