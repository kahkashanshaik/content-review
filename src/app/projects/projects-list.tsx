"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/client/api";
import type { Project } from "@/domain/types";

type ProjectSummary = Project & {
  role: "owner" | "member";
  pageCount: number;
  stringCount: number;
  editedCount: number;
};

type ProjectsState =
  | { status: "loading" }
  | { status: "ready"; projects: ProjectSummary[] }
  | { status: "error"; message: string };

export function ProjectsList() {
  const [state, setState] = useState<ProjectsState>({ status: "loading" });
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const body = await apiRequest<{ projects: ProjectSummary[] }>("/api/projects");
        if (!cancelled) {
          setState({ status: "ready", projects: body.projects });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Projects could not be loaded.",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (state.status !== "ready") {
      return [];
    }

    const needle = query.trim().toLowerCase();
    if (needle === "") {
      return state.projects;
    }

    return state.projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(needle) ||
        project.originUrl.toLowerCase().includes(needle) ||
        project.allowedHost.toLowerCase().includes(needle)
      );
    });
  }, [query, state]);

  if (state.status === "loading") {
    return <p className="mt-6 text-sm text-slate-600">Loading projects…</p>;
  }

  if (state.status === "error") {
    return (
      <p role="alert" className="mt-6 text-sm text-red-700">
        {state.message}
      </p>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex justify-end">
        <label className="sr-only" htmlFor="project-search">
          Search a project
        </label>
        <input
          id="project-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Search a project"
          className="w-72 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-700">
          No projects yet.{" "}
          <Link href="/projects/new" className="font-medium text-[#5b4dff] underline">
            Create a project
          </Link>{" "}
          with your website URL.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <p className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
            {filtered.length} result(s)
          </p>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Pages</th>
                <th className="px-4 py-3">Strings</th>
                <th className="px-4 py-3">Edits saved</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project.id} className="border-t border-slate-200">
                  <td className="px-4 py-4">
                    <Link href={`/projects/${project.id}`} className="font-medium text-slate-900 hover:underline">
                      {project.name}
                    </Link>
                    <p className="text-slate-500">{project.originUrl}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {project.role === "owner" ? "Owner" : "Invited"}
                  </td>
                  <td className="px-4 py-4">{project.pageCount}</td>
                  <td className="px-4 py-4">{project.stringCount}</td>
                  <td className="px-4 py-4">
                    {project.editedCount} / {project.stringCount}
                    <div className="mt-1 h-1.5 w-40 overflow-hidden rounded bg-slate-200">
                      <div
                        className="h-full bg-[#5b4dff]"
                        style={{
                          width: `${project.stringCount === 0 ? 0 : Math.round((project.editedCount / project.stringCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
