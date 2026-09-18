import { ProjectPages } from "./project-pages";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10">
      <ProjectPages projectId={projectId} />
    </main>
  );
}
