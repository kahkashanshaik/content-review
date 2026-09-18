import type { ContentChange, ContentItem } from "../../domain/types.ts";
import type { Repositories } from "../ports/repositories.ts";

export async function listPageContentChanges(
  pageId: string,
  repos: Repositories,
): Promise<{ items: ContentItem[]; changes: ContentChange[] }> {
  const items = await repos.contentItems.listByPage(pageId);
  const changes: ContentChange[] = [];

  for (const item of items) {
    const listed = await repos.changes.listByContentItem(item.id);
    changes.push(...listed);
  }

  return { items, changes };
}

export function submittedChangeIds(revisions: readonly { changeIds: readonly string[] }[]): Set<string> {
  const ids = new Set<string>();
  for (const revision of revisions) {
    for (const changeId of revision.changeIds) {
      ids.add(changeId);
    }
  }
  return ids;
}

export function countAwaitingReview(
  changes: readonly ContentChange[],
  submittedIds: ReadonlySet<string>,
): number {
  return changes.filter(
    (change) => change.status === "pending" && submittedIds.has(change.id),
  ).length;
}
