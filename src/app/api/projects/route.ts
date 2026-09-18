import { listAccessibleProjects } from "@/application/use-cases/project-access";
import { createProject } from "@/application/use-cases/create-project";
import { createError, ERROR_CODES } from "@/domain/errors";
import { jsonError, jsonOk, readJson, requireUser, stores } from "@/server/http/api";
import { crawlAndPersistPage } from "@/server/projects/crawl-and-persist";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const user = await requireUser();
  if (!user.ok) {
    return jsonError(user.error);
  }

  const projects = await listAccessibleProjects(user.value.id, stores.repositories);
  const summaries = await Promise.all(
    projects.map(async (project) => {
      const pages = await stores.repositories.pages.listByProject(project.id);
      let strings = 0;
      let edited = 0;
      for (const page of pages) {
        const items = await stores.repositories.contentItems.listByPage(page.id);
        strings += items.length;
        edited += items.filter((item) => item.currentText !== item.originalText).length;
      }

      return {
        ...project,
        role: project.userId === user.value.id ? "owner" : "member",
        pageCount: pages.length,
        stringCount: strings,
        editedCount: edited,
      };
    }),
  );

  return jsonOk({ projects: summaries });
}

export async function POST(request: Request): Promise<Response> {
  const user = await requireUser();
  if (!user.ok) {
    return jsonError(user.error);
  }

  const body = await readJson(request);
  const name = readString(body, "name");
  const originUrl = readString(body, "originUrl") ?? readString(body, "url");
  if (name === undefined || originUrl === undefined) {
    return jsonError(
      createError(ERROR_CODES.VALIDATION_ERROR, "A project name and website URL are required."),
    );
  }

  const created = createProject({
    name,
    userId: user.value.id,
    originUrl,
  });
  if (!created.ok) {
    return jsonError(created.error);
  }

  const duplicate = await stores.repositories.projects.getByUserAndHost(
    user.value.id,
    created.value.allowedHost,
  );
  if (duplicate !== undefined) {
    return jsonError(
      createError(ERROR_CODES.CONFLICT, "You already have a project for this website domain.", {
        allowedHost: created.value.allowedHost,
      }),
    );
  }

  await stores.repositories.projects.save(created.value);
  const persisted = await crawlAndPersistPage(
    created.value,
    originUrl,
    stores.repositories,
  );
  if (!persisted.ok) {
    return jsonOk({ project: created.value }, 201);
  }

  return jsonOk(
    {
      project: created.value,
      page: persisted.value.page,
    },
    201,
  );
}

function readString(body: unknown, key: string): string | undefined {
  if (typeof body !== "object" || body === null || !(key in body)) {
    return undefined;
  }

  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
