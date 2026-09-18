import "fake-indexeddb/auto";

import assert from "node:assert/strict";
import { test } from "node:test";

import type { Repositories } from "../ports/repositories.ts";
import { persistCrawledPage } from "./persist-crawled-page.ts";
import { saveContentEdit } from "./save-content-edit.ts";
import { createMemoryRepositories } from "../../persistence/memory/create-repositories.ts";
import { saveTestProject } from "../../persistence/memory/test-project.ts";

test("saveContentEdit preserves original text and records a pending change", async () => {
  await withRepositories(async (repos) => {
    const contentId = "content_0123456789abcdef0123456789abcdef";
    await persistSample(repos, contentId);

    const result = await saveContentEdit(
      { contentItemId: contentId, newText: "  Hallo <script>alert(1)</script>  " },
      repos,
      () => "2026-09-09T01:00:00.000Z",
    );

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.value.item.originalText, "Hello");
    assert.equal(result.value.item.currentText, "Hallo <script>alert(1)</script>");
    assert.equal(result.value.change?.status, "pending");
    assert.equal(result.value.change?.originalValue, "Hello");
    assert.equal(result.value.change?.newValue, "Hallo <script>alert(1)</script>");

    const loaded = await repos.contentItems.getById(contentId);
    assert.equal(loaded?.originalText, "Hello");
    assert.equal(loaded?.currentText, "Hallo <script>alert(1)</script>");
  });
});

test("saveContentEdit upserts one pending change and can revert to original", async () => {
  await withRepositories(async (repos) => {
    const contentId = "content_0123456789abcdef0123456789abcdef";
    await persistSample(repos, contentId);

    const first = await saveContentEdit(
      { contentItemId: contentId, newText: "One" },
      repos,
      () => "2026-09-09T01:00:00.000Z",
    );
    const second = await saveContentEdit(
      { contentItemId: contentId, newText: "Two" },
      repos,
      () => "2026-09-09T02:00:00.000Z",
    );

    assert.equal(first.ok && second.ok, true);
    if (!first.ok || !second.ok) {
      return;
    }

    assert.equal(first.value.change?.id, second.value.change?.id);
    assert.equal(second.value.change?.newValue, "Two");
    assert.equal((await repos.changes.listByContentItem(contentId)).length, 1);

    const reverted = await saveContentEdit(
      { contentItemId: contentId, newText: "Hello" },
      repos,
      () => "2026-09-09T03:00:00.000Z",
    );
    assert.equal(reverted.ok, true);
    if (!reverted.ok) {
      return;
    }

    assert.equal(reverted.value.item.currentText, "Hello");
    assert.equal(reverted.value.change, undefined);
    assert.equal((await repos.changes.listByContentItem(contentId)).length, 0);
  });
});

test("saveContentEdit stays scoped to the selected page state", async () => {
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
                id: "content_cccccccccccccccccccccccccccccccc",
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
                id: "content_dddddddddddddddddddddddddddddddd",
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

    const edited = await saveContentEdit(
      { contentItemId: "content_dddddddddddddddddddddddddddddddd", newText: "Slide 2 edited" },
      repos,
    );
    assert.equal(edited.ok, true);

    const slide1 = await repos.contentItems.getById("content_cccccccccccccccccccccccccccccccc");
    const slide2 = await repos.contentItems.getById("content_dddddddddddddddddddddddddddddddd");
    assert.equal(slide1?.currentText, "Slide 1");
    assert.equal(slide2?.currentText, "Slide 2 edited");
    assert.equal(slide2?.originalText, "Slide 2");
  });
});

async function persistSample(repos: Repositories, contentId: string): Promise<void> {
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
          order: 0,
          mapped: true,
        },
      ],
    },
    repos,
    () => "2026-09-09T00:00:00.000Z",
  );

  assert.equal(persisted.ok, true);
}

async function withRepositories(run: (repos: Repositories) => Promise<void>): Promise<void> {
  await run(createMemoryRepositories());
}
