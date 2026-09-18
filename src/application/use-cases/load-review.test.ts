import "fake-indexeddb/auto";

import assert from "node:assert/strict";
import { test } from "node:test";

import { persistCrawledPage } from "./persist-crawled-page.ts";
import { loadReview } from "./load-review.ts";
import { saveContentEdit } from "./save-content-edit.ts";
import { createMemoryRepositories } from "../../persistence/memory/create-repositories.ts";
import { saveTestProject } from "../../persistence/memory/test-project.ts";
import type { Repositories } from "../ports/repositories.ts";

test("loadReview returns persisted snapshot and pending edits", async () => {
  await withRepositories(async (repos) => {
    const contentId = "content_0123456789abcdef0123456789abcdef";
    const persisted = await persistCrawledPage(
      {
        projectId: (await saveTestProject(repos)).id,
        sourceUrl: "https://example.com/",
        sanitizedHtml: "<html><body><h1>Hello</h1></body></html>",
        title: "Demo",
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
      return;
    }

    await saveContentEdit(
      { contentItemId: contentId, newText: "Hallo" },
      repos,
      () => "2026-09-09T01:00:00.000Z",
    );

    const loaded = await loadReview(persisted.value.page.id, repos);
    assert.equal(loaded.ok, true);
    if (!loaded.ok) {
      return;
    }

    assert.equal(loaded.value.project.name, "Launch");
    assert.equal(loaded.value.snapshot.sanitizedHtml.includes("Hello"), true);
    assert.equal(loaded.value.items[0]?.currentText, "Hallo");
    assert.equal(loaded.value.items[0]?.originalText, "Hello");
    assert.equal(loaded.value.pendingChanges.length, 1);
    assert.equal(loaded.value.reviewChanges.length, 1);
    assert.equal(loaded.value.reviewChanges[0]?.change.newValue, "Hallo");
    assert.equal(loaded.value.reviewChanges[0]?.submitted, false);
    assert.equal(loaded.value.revisions.length, 0);
    assert.equal(loaded.value.states.length, 1);
    assert.equal(loaded.value.sanitizedHtml.includes("Hello"), true);
  });
});

test("loadReview can select a non-default state", async () => {
  await withRepositories(async (repos) => {
    const persisted = await persistCrawledPage(
      {
        projectId: (await saveTestProject(repos)).id,
        sourceUrl: "https://example.com/",
        sanitizedHtml: "<html><body><p>Slide 1</p></body></html>",
        items: [
          {
            id: "content_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            elementType: "p",
            text: "Slide 1",
            selector: "p",
            direction: "ltr",
            order: 0,
            mapped: true,
          },
        ],
        states: [
          {
            type: "default",
            key: "default",
            label: "Default",
            sanitizedHtml: "<html><body><p>Slide 1</p></body></html>",
            items: [
              {
                id: "content_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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
                id: "content_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
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

    const loaded = await loadReview(persisted.value.page.id, repos, {
      stateKey: "carousel:slide-2",
    });
    assert.equal(loaded.ok, true);
    if (!loaded.ok) {
      return;
    }

    assert.equal(loaded.value.state.key, "carousel:slide-2");
    assert.equal(loaded.value.items[0]?.currentText, "Slide 2");
    assert.match(loaded.value.sanitizedHtml, /Slide 2/);
  });
});

async function withRepositories(run: (repos: Repositories) => Promise<void>): Promise<void> {
  await run(createMemoryRepositories());
}
