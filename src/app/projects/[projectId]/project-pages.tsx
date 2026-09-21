"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { apiRequest } from "@/client/api";
import { LockedOriginPathField } from "@/client/origin/locked-origin-path-field";
import { pagePathFromUrl, parseWebsiteUrl, resolveProjectPageInput } from "@/domain/origin";
import type { Page, Project, ProjectRole } from "@/domain/types";

type ProjectPagesProps = {
  projectId: string;
};

type ProjectPageRow = Page & {
  awaitingReviewCount: number;
};

type ProjectMemberRow = {
  userId: string;
  email: string;
  role: ProjectRole;
};

type ProjectState =
  | { status: "loading" }
  | {
      status: "ready";
      project: Project;
      pages: ProjectPageRow[];
      role: ProjectRole;
      members: ProjectMemberRow[];
    }
  | { status: "error"; message: string };

export function ProjectPages({ projectId }: ProjectPagesProps) {
  const router = useRouter();
  const [state, setState] = useState<ProjectState>({ status: "loading" });
  const [path, setPath] = useState("/");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | undefined>(undefined);
  const [inviteLink, setInviteLink] = useState<string | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);
  const [recrawlingId, setRecrawlingId] = useState<string | undefined>(undefined);
  const [deletingPageId, setDeletingPageId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const body = await apiRequest<{
          project: Project;
          pages: ProjectPageRow[];
          role: ProjectRole;
          members: ProjectMemberRow[];
        }>(`/api/projects/${projectId}`);
        if (!cancelled) {
          setState({
            status: "ready",
            project: body.project,
            pages: body.pages,
            role: body.role,
            members: body.members,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "The project could not be loaded.",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function onAdd(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setFormError(undefined);
    try {
      const resolved = resolveProjectPageInput(state.status === "ready" ? state.project.originUrl : "", path);
      if (!resolved.ok) {
        setFormError(resolved.error.message);
        setBusy(false);
        return;
      }

      const result = await apiRequest<{ page: Page }>(`/api/projects/${projectId}/pages`, {
        method: "POST",
        body: JSON.stringify({ url: resolved.value }),
      });
      router.push(`/review/${result.page.id}`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "The page could not be added.");
      setBusy(false);
    }
  }

  async function onInvite(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setInviteBusy(true);
    setInviteMessage(undefined);
    setInviteLink(undefined);
    setFormError(undefined);
    try {
      const result = await apiRequest<{
        email: string;
        inviteUrl: string;
        createdAccount: boolean;
        emailSent: boolean;
        emailError?: string;
      }>(`/api/projects/${projectId}/invites`, { method: "POST", body: JSON.stringify({ email: inviteEmail }) });
      setInviteEmail("");
      setInviteMessage(
        result.emailSent
          ? result.createdAccount
            ? `Invite emailed to ${result.email}. They can set a password from that message.`
            : `Invite emailed to ${result.email}. They can open the project after they sign in.`
          : `${result.emailError ?? "The invite email could not be sent."} Share this invite link with ${result.email}.`,
      );
      setInviteLink(result.inviteUrl);
      const body = await apiRequest<{
        project: Project;
        pages: ProjectPageRow[];
        role: ProjectRole;
        members: ProjectMemberRow[];
      }>(`/api/projects/${projectId}`);
      setState({
        status: "ready",
        project: body.project,
        pages: body.pages,
        role: body.role,
        members: body.members,
      });
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "The invite could not be sent.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function onDeleteProject(): Promise<void> {
    if (!window.confirm("Delete this project and all of its pages? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setFormError(undefined);
    try {
      await apiRequest(`/api/projects/${projectId}`, { method: "DELETE" });
      router.push("/projects");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "The project could not be deleted.");
      setDeleting(false);
    }
  }

  async function reloadProject(): Promise<void> {
    const body = await apiRequest<{
      project: Project;
      pages: ProjectPageRow[];
      role: ProjectRole;
      members: ProjectMemberRow[];
    }>(`/api/projects/${projectId}`);
    setState({
      status: "ready",
      project: body.project,
      pages: body.pages,
      role: body.role,
      members: body.members,
    });
  }

  async function onRecrawlPage(page: ProjectPageRow): Promise<void> {
    if (
      !window.confirm(
        "Recrawl this page from the live website? The current snapshot and pending edits for this page will be replaced.",
      )
    ) {
      return;
    }

    setRecrawlingId(page.id);
    setFormError(undefined);
    try {
      const result = await apiRequest<{ page: Page }>(`/api/pages/${page.id}/recrawl`, { method: "POST" });
      router.push(`/review/${result.page.id}`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "The page could not be recrawled.");
      setRecrawlingId(undefined);
    }
  }

  async function onDeletePage(page: ProjectPageRow): Promise<void> {
    if (!window.confirm("Delete this crawled page and its edits? This cannot be undone.")) {
      return;
    }

    setDeletingPageId(page.id);
    setFormError(undefined);
    try {
      await apiRequest(`/api/pages/${page.id}`, { method: "DELETE" });
      await reloadProject();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "The page could not be deleted.");
    } finally {
      setDeletingPageId(undefined);
    }
  }

  if (state.status === "loading") {
    return <p className="mt-3 text-sm text-slate-600">Loading project…</p>;
  }

  if (state.status === "error") {
    return (
      <p role="alert" className="mt-3 text-sm text-red-700">
        {state.message}
      </p>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{state.project.name}</h1>
          <p className="mt-1 text-slate-600">
            Website domain is locked to{" "}
            <span className="font-medium text-slate-900">{state.project.originUrl}</span>. Add more pages with a path
            starting with <span className="font-medium">/</span>.
            {state.role === "member" ? " You were invited to this project." : null}
          </p>
        </div>
        {state.role === "owner" ? (
          <button
            type="button"
            onClick={() => {
              void onDeleteProject();
            }}
            disabled={deleting}
            className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:text-slate-400"
          >
            {deleting ? "Deleting…" : "Delete project"}
          </button>
        ) : null}
      </div>

      <form className="mt-6 flex max-w-3xl flex-wrap gap-2" onSubmit={(event) => void onAdd(event)}>
        <LockedOriginPathField
          id="add-page-path"
          originUrl={state.project.originUrl}
          path={path}
          onPathChange={setPath}
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[#5b4dff] px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
        >
          {busy ? "Crawling…" : "Add page"}
        </button>
      </form>
      {formError === undefined ? null : (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <section className="mt-8 max-w-3xl rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Team</h2>
        <p className="mt-1 text-sm text-slate-600">
          Invited people can add pages, edit copy, and approve or reject changes. They cannot delete this project.
        </p>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => void onInvite(event)}>
          <label className="sr-only" htmlFor="invite-email">
            Teammate email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={inviteEmail}
            onChange={(event) => {
              setInviteEmail(event.target.value);
            }}
            placeholder="teammate@example.com"
            className="min-w-64 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={inviteBusy}
            className="rounded-md bg-[#5b4dff] px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          >
            {inviteBusy ? "Inviting…" : "Invite"}
          </button>
        </form>
        {inviteMessage === undefined ? null : (
          <p className="mt-2 text-sm text-slate-700" role="status">
            {inviteMessage}
          </p>
        )}
        {inviteLink === undefined ? null : (
          <p className="mt-1 break-all text-sm text-slate-600" dir="ltr">
            Invite link: {inviteLink}
          </p>
        )}
        <ul className="mt-4 grid gap-1 text-sm text-slate-700">
          {state.members.map((member) => (
            <li key={member.userId}>
              {member.email}
              <span className="text-slate-500"> · {member.role === "owner" ? "Owner" : "Invited"}</span>
            </li>
          ))}
        </ul>
      </section>

      {state.pages.length === 0 ? (
        <p className="mt-6 text-slate-700">This project has no crawled pages yet.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {state.pages.map((page) => {
            const pageBusy = recrawlingId === page.id || deletingPageId === page.id;
            return (
              <li
                key={page.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <Link
                  href={`/review/${page.id}`}
                  className="flex min-w-0 flex-1 items-center justify-between gap-4 text-slate-900 hover:text-[#5b4dff]"
                >
                  <span className="min-w-0 truncate font-medium" dir="ltr">
                    {pagePathLabel(page.sourceUrl)}
                  </span>
                  <span className="shrink-0 text-sm text-slate-600">
                    {awaitingReviewLabel(page.awaitingReviewCount)}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void onRecrawlPage(page);
                  }}
                  disabled={pageBusy || recrawlingId !== undefined}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:text-slate-400"
                >
                  {recrawlingId === page.id ? "Recrawling…" : "Recrawl"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void onDeletePage(page);
                  }}
                  disabled={pageBusy || recrawlingId !== undefined}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:text-slate-400"
                >
                  {deletingPageId === page.id ? "Deleting…" : "Delete"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function pagePathLabel(sourceUrl: string): string {
  const parsed = parseWebsiteUrl(sourceUrl);
  return parsed.ok ? pagePathFromUrl(parsed.value) : sourceUrl;
}

function awaitingReviewLabel(count: number): string {
  return count === 1 ? "1 change awaiting review" : `${count} changes awaiting review`;
}
