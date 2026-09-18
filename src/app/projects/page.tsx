import Link from "next/link";

import { ProjectsList } from "./projects-list";

export default function ProjectsPage() {
  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        <Link
          href="/projects/new"
          className="rounded-md bg-[#5b4dff] px-4 py-2 text-sm font-semibold text-white"
        >
          Create project
        </Link>
      </div>
      <ProjectsList />
    </main>
  );
}
