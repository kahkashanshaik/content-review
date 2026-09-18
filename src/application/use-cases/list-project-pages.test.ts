import assert from "node:assert/strict";
import { test } from "node:test";

import { persistCrawledPage, type PersistableContentItem } from "./persist-crawled-page.ts";
import { listProjectPages } from "./list-project-pages.ts";
import { reviewChange } from "./review-change.ts";
import { saveContentEdit } from "./save-content-edit.ts";
import { submitRevision } from "./submit-revision.ts";
import { createMemoryRepositories } from "../../persistence/memory/create-repositories.ts";
import { saveTestProject } from "../../persistence/memory/test-project.ts";
import type { Repositories } from "../ports/repositories.ts";

const HOME_CONTENT = "content_0123456789abcdef0123456789abcdef";
const ABOUT_CONTENT = "content_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test("listProjectPages counts submitted pending changes and ignores drafts and decided reviews", async () => {
  const repos = createMemoryRepositories();
  const project = await saveTestProject(repos);
  const home = await persistPage(repos, project.id, "https://example.com/", HOME_CONTENT, "Home title");
  const about = await persistPage(repos, project.id, "https://example.com/about", ABOUT_CONTENT, "About title");

  await saveContentEdit({ contentItemId: HOME_CONTENT, newText: "Draft home" }, repos);
  await saveContentEdit({ contentItemId: ABOUT_CONTENT, newText: "About edited" }, repos);
  const submitted = await submitRevision({ pageId: about.id }, repos);
  assert.equal(submitted.ok, true);

  let listed = await listProjectPages(project.id, repos);
  assert.equal(listed.find((page) => page.id === home.id)?.awaitingReviewCount, 0);
  assert.equal(listed.find((page) => page.id === about.id)?.awaitingReviewCount, 1);
  assert.equal(listed.find((page) => page.id === home.id)?.title, "Home title");

  const changeId = submitted.ok ? submitted.value.changes[0]?.id : undefined;
  assert.ok(changeId);
  const accepted = await reviewChange({ changeId, decision: "accepted" }, repos);
  assert.equal(accepted.ok, true);

  listed = await listProjectPages(project.id, repos);
  assert.equal(listed.find((page) => page.id === about.id)?.awaitingReviewCount, 0);
});

async function persistPage(
  repos: Repositories,
  projectId: string,
  sourceUrl: string,
  contentId: string,
  title: string,
): Promise<{ id: string }> {
  const item: PersistableContentItem = {
    id: contentId,
    elementType: "h1",
    text: "Hello",
    selector: "h1",
    direction: "ltr",
    language: "en",
    order: 0,
    mapped: true,
  };
  const persisted = await persistCrawledPage(
    {
      projectId,
      sourceUrl,
      title,
      sanitizedHtml: "<html><body><h1>Hello</h1></body></html>",
      items: [item],
    },
    repos,
  );
  assert.equal(persisted.ok, true);
  if (!persisted.ok) {
    throw new Error("persist failed");
  }

  return persisted.value.page;
}
