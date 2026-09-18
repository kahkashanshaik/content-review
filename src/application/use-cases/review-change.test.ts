import "fake-indexeddb/auto";

import assert from "node:assert/strict";
import { test } from "node:test";

import { persistCrawledPage } from "./persist-crawled-page.ts";
import { reviewChange } from "./review-change.ts";
import { saveContentEdit } from "./save-content-edit.ts";
import { submitRevision } from "./submit-revision.ts";
import { loadReview } from "./load-review.ts";
import { createMemoryRepositories } from "../../persistence/memory/create-repositories.ts";
import { saveTestProject } from "../../persistence/memory/test-project.ts";
import type { Repositories } from "../ports/repositories.ts";

const CONTENT_ID = "content_0123456789abcdef0123456789abcdef";
const SLIDE_1 = "content_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const SLIDE_2 = "content_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

test("submitRevision groups new pending changes and skips already submitted ids", async () => {
  await withRepositories(async (repos) => {
    const pageId = await persistAndEdit(repos, CONTENT_ID, "Hallo");
    const first = await submitRevision({ pageId }, repos, () => "2026-09-09T02:00:00.000Z");
    assert.equal(first.ok, true);
    if (!first.ok) {
      return;
    }

    assert.equal(first.value.changes.length, 1);
    assert.equal(first.value.revision.changeIds.length, 1);
    assert.equal(first.value.changes[0]?.status, "pending");

    const second = await submitRevision({ pageId }, repos, () => "2026-09-09T03:00:00.000Z");
    assert.equal(second.ok, false);
    if (!second.ok) {
      assert.equal(second.error.code, "VALIDATION_ERROR");
    }

    const listed = await repos.revisions.listByPage(pageId);
    assert.equal(listed.length, 1);
  });
});

test("reviewChange accepts submitted text and keeps the current value", async () => {
  await withRepositories(async (repos) => {
    const pageId = await persistAndEdit(repos, CONTENT_ID, "Hallo");
    const submitted = await submitRevision({ pageId }, repos, () => "2026-09-09T02:00:00.000Z");
    assert.equal(submitted.ok, true);
    if (!submitted.ok) {
      return;
    }

    const changeId = submitted.value.changes[0]?.id;
    assert.ok(changeId);
    const reviewed = await reviewChange(
      { changeId, decision: "accepted" },
      repos,
      () => "2026-09-09T03:00:00.000Z",
    );
    assert.equal(reviewed.ok, true);
    if (!reviewed.ok) {
      return;
    }

    assert.equal(reviewed.value.change.status, "accepted");
    assert.equal(reviewed.value.item.currentText, "Hallo");
    assert.equal(reviewed.value.item.originalText, "Hello");

    const again = await reviewChange({ changeId, decision: "rejected" }, repos);
    assert.equal(again.ok, false);
  });
});

test("reviewChange rejects submitted text and restores the original", async () => {
  await withRepositories(async (repos) => {
    const pageId = await persistAndEdit(repos, CONTENT_ID, "Hallo");
    const submitted = await submitRevision({ pageId }, repos, () => "2026-09-09T02:00:00.000Z");
    assert.equal(submitted.ok, true);
    if (!submitted.ok) {
      return;
    }

    const changeId = submitted.value.changes[0]?.id;
    assert.ok(changeId);
    const reviewed = await reviewChange(
      { changeId, decision: "rejected" },
      repos,
      () => "2026-09-09T03:00:00.000Z",
    );
    assert.equal(reviewed.ok, true);
    if (!reviewed.ok) {
      return;
    }

    assert.equal(reviewed.value.change.status, "rejected");
    assert.equal(reviewed.value.item.currentText, "Hello");
    assert.equal(reviewed.value.item.originalText, "Hello");
  });
});

test("reviewChange requires a submitted revision", async () => {
  await withRepositories(async (repos) => {
    await persistAndEdit(repos, CONTENT_ID, "Hallo");
    const loaded = await repos.contentItems.getById(CONTENT_ID);
    assert.ok(loaded);
    const pending = (await repos.changes.listByContentItem(CONTENT_ID)).find(
      (change) => change.status === "pending",
    );
    assert.ok(pending);

    const reviewed = await reviewChange({ changeId: pending.id, decision: "accepted" }, repos);
    assert.equal(reviewed.ok, false);
    if (!reviewed.ok) {
      assert.match(reviewed.error.message, /Submit this change/);
    }
  });
});

test("a new edit after accept creates a new pending change", async () => {
  await withRepositories(async (repos) => {
    const pageId = await persistAndEdit(repos, CONTENT_ID, "Hallo");
    const submitted = await submitRevision({ pageId }, repos, () => "2026-09-09T02:00:00.000Z");
    assert.equal(submitted.ok, true);
    if (!submitted.ok) {
      return;
    }

    const changeId = submitted.value.changes[0]?.id;
    assert.ok(changeId);
    await reviewChange({ changeId, decision: "accepted" }, repos, () => "2026-09-09T03:00:00.000Z");

    const edited = await saveContentEdit(
      { contentItemId: CONTENT_ID, newText: "Hi" },
      repos,
      () => "2026-09-09T04:00:00.000Z",
    );
    assert.equal(edited.ok, true);
    if (!edited.ok) {
      return;
    }

    assert.equal(edited.value.change?.status, "pending");
    assert.notEqual(edited.value.change?.id, changeId);
    assert.equal(edited.value.item.originalText, "Hello");
    assert.equal(edited.value.item.currentText, "Hi");
    assert.equal(edited.value.change?.originalValue, "Hallo");

    const secondSubmit = await submitRevision({ pageId }, repos, () => "2026-09-09T05:00:00.000Z");
    assert.equal(secondSubmit.ok, true);
    if (!secondSubmit.ok || edited.value.change === undefined) {
      return;
    }

    const rejected = await reviewChange(
      { changeId: edited.value.change.id, decision: "rejected" },
      repos,
    );
    assert.equal(rejected.ok, true);
    if (!rejected.ok) {
      return;
    }

    assert.equal(rejected.value.item.currentText, "Hallo");
    assert.equal(rejected.value.item.originalText, "Hello");
  });
});

test("rejecting a carousel state does not revert another state", async () => {
  await withRepositories(async (repos) => {
    const persisted = await persistCrawledPage(
      {
        projectId: (await saveTestProject(repos)).id,
        sourceUrl: "https://example.com/",
        sanitizedHtml: "<html><body><p>Slide 1</p></body></html>",
        items: [],
        states: [
          {
            type: "default",
            key: "default",
            label: "Default",
            sanitizedHtml: "<html><body><p>Slide 1</p></body></html>",
            items: [
              {
                id: SLIDE_1,
                elementType: "p",
                text: "Slide 1",
                selector: "p",
                direction: "ltr",
                order: 0,
                mapped: true,
              },
            ],
          },
          {
            type: "carousel",
            key: "carousel:slide-2",
            label: "Slide 2",
            sanitizedHtml: "<html><body><p>Slide 2</p></body></html>",
            items: [
              {
                id: SLIDE_2,
                elementType: "p",
                text: "Slide 2",
                selector: "p",
                direction: "ltr",
                order: 0,
                mapped: true,
              },
            ],
          },
        ],
      },
      repos,
    );
    assert.equal(persisted.ok, true);
    if (!persisted.ok) {
      return;
    }

    await saveContentEdit({ contentItemId: SLIDE_2, newText: "Slide 2 edited" }, repos);
    await saveContentEdit({ contentItemId: SLIDE_1, newText: "Slide 1 edited" }, repos);
    const submitted = await submitRevision({ pageId: persisted.value.page.id }, repos);
    assert.equal(submitted.ok, true);
    if (!submitted.ok) {
      return;
    }

    const slide2Change = submitted.value.changes.find((change) => change.contentItemId === SLIDE_2);
    assert.ok(slide2Change);
    await reviewChange({ changeId: slide2Change.id, decision: "rejected" }, repos);

    const slide1 = await repos.contentItems.getById(SLIDE_1);
    const slide2 = await repos.contentItems.getById(SLIDE_2);
    assert.equal(slide1?.currentText, "Slide 1 edited");
    assert.equal(slide2?.currentText, "Slide 2");

    const loaded = await loadReview(persisted.value.page.id, repos);
    assert.equal(loaded.ok, true);
    if (!loaded.ok) {
      return;
    }

    assert.equal(loaded.value.reviewChanges.length, 2);
    assert.equal(loaded.value.revisions.length, 1);
    const rejected = loaded.value.reviewChanges.find((entry) => entry.item.id === SLIDE_2);
    assert.equal(rejected?.change.status, "rejected");
    assert.equal(rejected?.stateKey, "carousel:slide-2");
  });
});

async function persistAndEdit(
  repos: Repositories,
  contentId: string,
  newText: string,
): Promise<string> {
  const persisted = await persistCrawledPage(
    {
      projectId: (await saveTestProject(repos)).id,
      sourceUrl: "https://example.com/",
      sanitizedHtml: "<html><body><h1>Hello</h1></body></html>",
      items: [
        {
          id: contentId,
          elementType: "h1",
          text: "Hello",
          selector: "h1",
          direction: "ltr",
          language: "en",
          order: 0,
          mapped: true,
        },
      ],
    },
    repos,
    () => "2026-09-09T00:00:00.000Z",
  );
  assert.equal(persisted.ok, true);
  if (!persisted.ok) {
    throw new Error("persist failed");
  }

  await saveContentEdit(
    { contentItemId: contentId, newText },
    repos,
    () => "2026-09-09T01:00:00.000Z",
  );
  return persisted.value.page.id;
}

async function withRepositories(run: (repos: Repositories) => Promise<void>): Promise<void> {
  await run(createMemoryRepositories());
}
