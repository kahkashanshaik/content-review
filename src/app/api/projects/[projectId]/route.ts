import { listProjectPages } from "@/application/use-cases/list-project-pages";
import { deleteProject } from "@/application/use-cases/delete-project";
import { jsonError, jsonOk, requireProject, requireUser, stores } from "@/server/http/api";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const user = await requireUser();
  if (!user.ok) {
    return jsonError(user.error);
  }

  const { projectId } = await context.params;
  const project = await requireProject(user.value, projectId);
  if (!project.ok) {
    return jsonError(project.error);
  }

  const pages = await listProjectPages(project.value.id, stores.repositories);
  const members = await listProjectMembers(project.value.id, project.value.userId);
  return jsonOk({
    project: project.value,
    pages,
    role: project.role,
    members,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const user = await requireUser();
  if (!user.ok) {
    return jsonError(user.error);
  }

  const { projectId } = await context.params;
  const result = await deleteProject(user.value.id, projectId, stores.repositories);
  if (!result.ok) {
    return jsonError(result.error);
  }

  return jsonOk(result.value);
}

async function listProjectMembers(
  projectId: string,
  ownerId: string,
): Promise<Array<{ userId: string; email: string; role: "owner" | "member" }>> {
  const owner = await stores.users.getById(ownerId);
  const listed = await stores.repositories.members.listByProject(projectId);
  const members: Array<{ userId: string; email: string; role: "owner" | "member" }> = [];
  if (owner !== undefined) {
    members.push({ userId: owner.id, email: owner.email, role: "owner" });
  }

  for (const member of listed) {
    if (member.userId === ownerId) {
      continue;
    }
    const user = await stores.users.getById(member.userId);
    if (user !== undefined) {
      members.push({ userId: user.id, email: user.email, role: "member" });
    }
  }

  return members;
}
