import "fake-indexeddb/auto";

import assert from "node:assert/strict";
import { test } from "node:test";

import { createPage } from "../../../application/use-cases/create-page.ts";
import { createProject } from "../../../application/use-cases/create-project.ts";
import type { Repositories } from "../../../application/ports/repositories.ts";
import { createId } from "../../../domain/ids.ts";
import type {
  ContentChange,
  ContentItem,
  PageSnapshot,
  PageState,
  Revision,
} from "../../../domain/types.ts";
import { CONTENT_REVIEW_STORES, createContentReviewDatabase } from "./database.ts";
import { createDexieRepositories } from "./create-repositories.ts";

test("schema indexes cover project, page, state, and content relationships", () => {
  assert.match(CONTENT_REVIEW_STORES.pages, /projectId/);
  assert.match(CONTENT_REVIEW_STORES.snapshots, /pageId/);
  assert.match(CONTENT_REVIEW_STORES.pageStates, /pageSnapshotId/);
  assert.match(CONTENT_REVIEW_STORES.pageStates, /pageSnapshotId\+key/);
  assert.match(CONTENT_REVIEW_STORES.contentItems, /pageId/);
  assert.match(CONTENT_REVIEW_STORES.contentItems, /stateId/);
  assert.match(CONTENT_REVIEW_STORES.contentChanges, /contentItemId/);
  assert.match(CONTENT_REVIEW_STORES.contentChanges, /\bstatus\b/);
  assert.match(CONTENT_REVIEW_STORES.revisions, /pageId/);
});

test("projects persist through the repository port", async () => {
  await withRepositories(async (repos) => {
    const created = createProject(
      {
        name: "  Launch site  ",
        userId: "user_11111111-1111-4111-8111-111111111111",
        originUrl: "https://example.com",
      },
      () => "2026-09-09T00:00:00.000Z",
    );
    assert.equal(created.ok, true);
    if (!created.ok) {
      return;
    }

    await repos.projects.save(created.value);
    const loaded = await repos.projects.getById(created.value.id);

    assert.deepEqual(loaded, created.value);
    assert.equal((await repos.projects.list())[0]?.name, "Launch site");
  });
});

test("pages are listed only for their project", async () => {
  await withRepositories(async (repos) => {
    const projectA = createdProject("A");
    const projectB = createdProject("B");
    const pageA = createdPage(projectA.id, "https://a.example/one");
    const pageB = createdPage(projectB.id, "https://b.example/two");

    await repos.projects.save(projectA);
    await repos.projects.save(projectB);
    await repos.pages.save(pageA);
    await repos.pages.save(pageB);

    const forA = await repos.pages.listByProject(projectA.id);
    assert.deepEqual(forA.map((page) => page.id), [pageA.id]);
    assert.equal(forA[0]?.sourceUrl, "https://a.example/one");

    const snapshot = createdSnapshot("<div></div>", pageA.id);
    const state = createdState(snapshot.id, "default", "default", "Default");
    const item = createdContent(pageA.id, state.id, "Welcome", 0);
    const change = createdChange("Welcome", "Hello", "pending");
    await repos.snapshots.save(snapshot);
    await repos.states.save(state);
    await repos.contentItems.save({ ...item, id: change.contentItemId });
    await repos.changes.save(change);
    await repos.pages.delete(pageA.id);

    assert.equal(await repos.pages.getById(pageA.id), undefined);
    assert.equal(await repos.snapshots.getById(snapshot.id), undefined);
    assert.equal((await repos.pages.listByProject(projectA.id)).length, 0);
    assert.equal((await repos.pages.listByProject(projectB.id)).length, 1);
  });
});

test("snapshots store sanitized HTML as opaque text", async () => {
  await withRepositories(async (repos) => {
    const snapshot = createdSnapshot(
      '<h1>Safe</h1><script>alert("xss")</script>',
    );

    await repos.snapshots.save(snapshot);
    const loaded = await repos.snapshots.getById(snapshot.id);

    assert.equal(loaded?.sanitizedHtml, snapshot.sanitizedHtml);
    assert.match(loaded?.sanitizedHtml ?? "", /<script>/);
    assert.deepEqual(await repos.snapshots.listByPage(snapshot.pageId), [snapshot]);
  });
});

test("content items stay scoped to a page state", async () => {
  await withRepositories(async (repos) => {
    const pageId = createId("page");
    const snapshot = createdSnapshot("<div></div>", pageId);
    const slide1 = createdState(snapshot.id, "carousel", "slide-1", "Slide 1");
    const slide2 = createdState(snapshot.id, "carousel", "slide-2", "Slide 2");
    const heading1 = createdContent(pageId, slide1.id, "Welcome", 0);
    const heading2 = createdContent(pageId, slide2.id, "Details", 0);

    await repos.snapshots.save(snapshot);
    await repos.states.save(slide1);
    await repos.states.save(slide2);
    await repos.contentItems.save(heading1);
    await repos.contentItems.save(heading2);

    const slide1Items = await repos.contentItems.listByState(slide1.id);
    const pageItems = await repos.contentItems.listByPage(heading1.pageId);

    assert.deepEqual(slide1Items.map((item) => item.id), [heading1.id]);
    assert.equal(slide1Items[0]?.originalText, "Welcome");
    assert.equal(pageItems.length, 2);
  });
});

test("updating current text does not overwrite original text", async () => {
  await withRepositories(async (repos) => {
    const item = createdContent(createId("page"), createId("state"), "Original heading", 0);
    await repos.contentItems.save(item);

    await repos.contentItems.save({
      ...item,
      currentText: "Edited heading",
    });

    const loaded = await repos.contentItems.getById(item.id);
    assert.equal(loaded?.originalText, "Original heading");
    assert.equal(loaded?.currentText, "Edited heading");
  });
});

test("content items in one state are returned in order", async () => {
  await withRepositories(async (repos) => {
    const stateId = createId("state");
    const pageId = createId("page");
    const second = createdContent(pageId, stateId, "Second", 1);
    const first = createdContent(pageId, stateId, "First", 0);

    await repos.contentItems.save(second);
    await repos.contentItems.save(first);

    const listed = await repos.contentItems.listByState(stateId);
    assert.deepEqual(listed.map((item) => item.currentText), ["First", "Second"]);
  });
});

test("change statuses round-trip and preserve original values", async () => {
  await withRepositories(async (repos) => {
    const pending = createdChange("Hello", "Hallo", "pending");
    await repos.changes.save(pending);

    const accepted: ContentChange = {
      ...pending,
      status: "accepted",
      updatedAt: "2026-09-09T01:00:00.000Z",
    };
    await repos.changes.save(accepted);

    const loaded = await repos.changes.getById(pending.id);
    assert.equal(loaded?.status, "accepted");
    assert.equal(loaded?.originalValue, "Hello");
    assert.equal(loaded?.newValue, "Hallo");

    assert.equal((await repos.changes.listByStatus("pending")).length, 0);
    assert.equal((await repos.changes.listByStatus("accepted"))[0]?.id, pending.id);
    assert.equal((await repos.changes.listByContentItem(pending.contentItemId)).length, 1);
  });
});

test("rejected changes remain queryable by status", async () => {
  await withRepositories(async (repos) => {
    const rejected = createdChange("One", "Two", "rejected");
    await repos.changes.save(rejected);

    const listed = await repos.changes.listByStatus("rejected");
    assert.equal(listed[0]?.id, rejected.id);
    assert.equal(listed[0]?.originalValue, "One");
  });
});

test("pending changes can be deleted after a revert", async () => {
  await withRepositories(async (repos) => {
    const pending = createdChange("Hello", "Hallo", "pending");
    await repos.changes.save(pending);
    await repos.changes.delete(pending.id);

    assert.equal(await repos.changes.getById(pending.id), undefined);
    assert.equal((await repos.changes.listByContentItem(pending.contentItemId)).length, 0);
  });
});

test("revisions store change ids for a page", async () => {
  await withRepositories(async (repos) => {
    const revision = createdRevision(["change-a", "change-b"]);
    await repos.revisions.save(revision);

    const listed = await repos.revisions.listByPage(revision.pageId);
    assert.deepEqual(listed[0]?.changeIds, ["change-a", "change-b"]);
    assert.deepEqual(await repos.revisions.getById(revision.id), revision);
  });
});

test("duplicate page state keys for the same snapshot are rejected", async () => {
  await withRepositories(async (repos) => {
    const snapshotId = createId("snapshot");
    const first = createdState(snapshotId, "tab", "overview", "Overview");
    const duplicate = createdState(snapshotId, "tab", "overview", "Overview copy");

    await repos.states.save(first);
    await assert.rejects(() => repos.states.save(duplicate));
  });
});

async function withRepositories(
  run: (repos: Repositories) => Promise<void>,
): Promise<void> {
  const db = createContentReviewDatabase(`content-review-test-${crypto.randomUUID()}`);

  try {
    await run(createDexieRepositories(db));
  } finally {
    db.close();
    await db.delete();
  }
}

function createdProject(name: string) {
  const result = createProject(
    {
      name,
      userId: "user_11111111-1111-4111-8111-111111111111",
      originUrl: `https://${name.toLowerCase()}.example`,
    },
    () => "2026-09-09T00:00:00.000Z",
  );
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

function createdPage(projectId: string, sourceUrl: string) {
  const result = createPage({ projectId, sourceUrl }, () => "2026-09-09T00:00:00.000Z");
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

function createdSnapshot(sanitizedHtml: string, pageId = createId("page")): PageSnapshot {
  return {
    id: createId("snapshot"),
    pageId,
    sanitizedHtml,
    createdAt: "2026-09-09T00:00:00.000Z",
  };
}

function createdState(
  pageSnapshotId: string,
  type: PageState["type"],
  key: string,
  label: string,
): PageState {
  return {
    id: createId("state"),
    pageSnapshotId,
    type,
    key,
    label,
  };
}

function createdContent(
  pageId: string,
  stateId: string,
  text: string,
  order: number,
): ContentItem {
  return {
    id: createId("content"),
    pageId,
    stateId,
    elementType: "h1",
    originalText: text,
    currentText: text,
    order,
  };
}

function createdChange(
  originalValue: string,
  newValue: string,
  status: ContentChange["status"],
): ContentChange {
  return {
    id: createId("change"),
    contentItemId: createId("content"),
    originalValue,
    newValue,
    status,
    createdAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
  };
}

function createdRevision(changeIds: string[]): Revision {
  return {
    id: createId("revision"),
    pageId: createId("page"),
    createdAt: "2026-09-09T00:00:00.000Z",
    changeIds,
  };
}
