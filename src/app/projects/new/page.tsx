import { NewProjectForm } from "./new-project-form";

export default function NewProjectPage() {
  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Create project</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Enter the live website URL. That host is locked, then you can add more paths from the same domain.
      </p>
      <NewProjectForm />
    </main>
  );
}
