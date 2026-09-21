import assert from "node:assert/strict";
import { test } from "node:test";

import { createMemoryUsers } from "../../persistence/memory/create-auth.ts";
import { createMemoryRepositories } from "../../persistence/memory/create-repositories.ts";
import { saveTestProject, TEST_USER_ID } from "../../persistence/memory/test-project.ts";
import { createId } from "../../domain/ids.ts";
import type { ContentChange, ContentItem, Page, PageSnapshot, PageState, Revision } from "../../domain/types.ts";
import { deletePage } from "./delete-page.ts";
import { inviteMember } from "./invite-member.ts";

test("deletePage removes a crawled page and its snapshot data", async () => {
  const repos = createMemoryRepositories();
  const project = await saveTestProject(repos);
  const page = createdPage(project.id);
  const snapshot = createdSnapshot(page.id, page.snapshotId);
  const state = createdState(snapshot.id);
  const item = createdContent(page.id, state.id);
  const change = createdChange(item.id);
  const revision = createdRevision(page.id, [change.id]);

  await repos.pages.save(page);
  await repos.snapshots.save(snapshot);
  await repos.states.save(state);
  await repos.contentItems.save(item);
  await repos.changes.save(change);
  await repos.revisions.save(revision);

  const result = await deletePage(TEST_USER_ID, page.id, repos);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.id, page.id);
  assert.equal(await repos.pages.getById(page.id), undefined);
  assert.equal(await repos.snapshots.getById(snapshot.id), undefined);
  assert.equal(await repos.states.getById(state.id), undefined);
  assert.equal(await repos.contentItems.getById(item.id), undefined);
  assert.equal(await repos.changes.getById(change.id), undefined);
  assert.equal(await repos.revisions.getById(revision.id), undefined);
  assert.equal((await repos.projects.getById(project.id))?.id, project.id);
});

test("deletePage allows invited members to remove a page but not a missing page", async () => {
  const repos = createMemoryRepositories();
  const users = createMemoryUsers();
  await users.save({
    id: TEST_USER_ID,
    email: "owner@example.com",
    passwordHash: "hash:secret",
    passwordSet: true,
    createdAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
  });
  const project = await saveTestProject(repos);
  const page = createdPage(project.id);
  await repos.pages.save(page);
  const invited = await inviteMember(
    {
      projectId: project.id,
      email: "dev@example.com",
      invitedByUserId: TEST_USER_ID,
      appOrigin: "http://localhost:3028",
    },
    repos,
    users,
    { async send() {} },
    () => new Date("2026-09-09T00:00:00.000Z"),
    async (password) => `hash:${password}`,
  );
  assert.equal(invited.ok, true);
  if (!invited.ok) {
    return;
  }

  const user = await users.getByEmail("dev@example.com");
  assert.ok(user);
  const deleted = await deletePage(user.id, page.id, repos);
  assert.equal(deleted.ok, true);

  const missing = await deletePage(TEST_USER_ID, page.id, repos);
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.equal(missing.error.code, "NOT_FOUND");
  }
});

test("deletePage forbids users without project access", async () => {
  const repos = createMemoryRepositories();
  const project = await saveTestProject(repos);
  const page = createdPage(project.id);
  await repos.pages.save(page);

  const result = await deletePage("user_22222222-2222-4222-8222-222222222222", page.id, repos);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "FORBIDDEN");
  }
  assert.equal((await repos.pages.getById(page.id))?.id, page.id);
});

function createdPage(projectId: string): Page {
  return {
    id: createId("page"),
    projectId,
    sourceUrl: "https://example.com/about",
    snapshotId: createId("snapshot"),
    createdAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
  };
}

function createdSnapshot(pageId: string, id: string): PageSnapshot {
  return {
    id,
    pageId,
    sanitizedHtml: "<html><body><h1>About</h1></body></html>",
    createdAt: "2026-09-09T00:00:00.000Z",
  };
}

function createdState(pageSnapshotId: string): PageState {
  return {
    id: createId("state"),
    pageSnapshotId,
    type: "default",
    key: "default",
    label: "Default",
  };
}

function createdContent(pageId: string, stateId: string): ContentItem {
  return {
    id: createId("content"),
    pageId,
    stateId,
    elementType: "h1",
    originalText: "About",
    currentText: "About",
    order: 0,
  };
}

function createdChange(contentItemId: string): ContentChange {
  return {
    id: createId("change"),
    contentItemId,
    originalValue: "About",
    newValue: "About us",
    status: "pending",
    createdAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
  };
}

function createdRevision(pageId: string, changeIds: string[]): Revision {
  return {
    id: createId("revision"),
    pageId,
    createdAt: "2026-09-09T00:00:00.000Z",
    changeIds,
  };
}
