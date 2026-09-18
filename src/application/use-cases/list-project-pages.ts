import type { Page } from "../../domain/types.ts";
import type { Repositories } from "../ports/repositories.ts";
import { countAwaitingReview, listPageContentChanges, submittedChangeIds } from "./page-changes.ts";

export type ProjectPageSummary = Page & {
  awaitingReviewCount: number;
};

export async function listProjectPages(
  projectId: string,
  repos: Repositories,
): Promise<ProjectPageSummary[]> {
  const pages = await repos.pages.listByProject(projectId);
  const summaries: ProjectPageSummary[] = [];

  for (const page of pages) {
    const { changes } = await listPageContentChanges(page.id, repos);
    const revisions = await repos.revisions.listByPage(page.id);
    summaries.push({
      ...page,
      awaitingReviewCount: countAwaitingReview(changes, submittedChangeIds(revisions)),
    });
  }

  return summaries;
}
