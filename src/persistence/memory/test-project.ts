import { createProject } from "../../application/use-cases/create-project.ts";
import type { Repositories } from "../../application/ports/repositories.ts";
import type { Project } from "../../domain/types.ts";

export const TEST_USER_ID = "user_11111111-1111-4111-8111-111111111111";

export async function saveTestProject(
  repos: Repositories,
  originUrl = "https://example.com",
  name = "Launch",
): Promise<Project> {
  const created = createProject(
    { name, userId: TEST_USER_ID, originUrl },
    () => "2026-09-09T00:00:00.000Z",
  );
  if (!created.ok) {
    throw new Error(created.error.message);
  }

  await repos.projects.save(created.value);
  return created.value;
}
