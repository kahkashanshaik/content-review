import assert from "node:assert/strict";
import { test } from "node:test";

import { persistCrawledPage } from "./persist-crawled-page.ts";
import { createMemoryRepositories } from "../../persistence/memory/create-repositories.ts";
import { saveTestProject } from "../../persistence/memory/test-project.ts";

test("persistCrawledPage stores snapshot, default state, and mapped content", async () => {
  const repos = createMemoryRepositories();
  const project = await saveTestProject(repos);
  const result = await persistCrawledPage(
    {
      projectId: project.id,
      sourceUrl: "https://example.com/",
      sanitizedHtml: `<html><body><h1 data-content-id="content_0123456789abcdef0123456789abcdef">Hello</h1></body></html>`,
      title: "Demo",
      items: [
        {
          id: "content_0123456789abcdef0123456789abcdef",
          elementType: "h1",
          text: "Hello",
          selector: "body:nth-of-type(1) > h1:nth-of-type(1)",
          direction: "ltr",
          order: 0,
          mapped: true,
        },
        {
          id: "content_ffffffffffffffffffffffffffffffff",
          elementType: "p",
          text: "Unmapped",
          selector: "p",
          direction: "ltr",
          order: 1,
          mapped: false,
        },
      ],
    },
    repos,
    () => "2026-09-09T00:00:00.000Z",
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const loaded = await repos.snapshots.getById(result.value.page.snapshotId);
  assert.equal(loaded?.sanitizedHtml.includes("Hello"), true);
  assert.equal(result.value.state.key, "default");
  assert.equal(result.value.items.length, 1);
  assert.equal(result.value.items[0]?.originalText, "Hello");
  assert.equal(result.value.items[0]?.currentText, "Hello");
  assert.equal(result.value.items[0]?.id, "content_0123456789abcdef0123456789abcdef");
});

test("persistCrawledPage stores distinct states without sharing content ids", async () => {
  const repos = createMemoryRepositories();
  const project = await saveTestProject(repos);
  const result = await persistCrawledPage(
    {
      projectId: project.id,
      sourceUrl: "https://example.com/",
      sanitizedHtml: "<html><body><p>Slide 1</p></body></html>",
      items: [
        {
          id: "content_11111111111111111111111111111111",
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
              id: "content_11111111111111111111111111111111",
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
              id: "content_22222222222222222222222222222222",
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

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.states.length, 2);
  const slide2 = result.value.states.find((state) => state.key === "carousel:slide-2");
  assert.ok(slide2);
  const slide2Items = await repos.contentItems.listByState(slide2.id);
  assert.equal(slide2Items[0]?.currentText, "Slide 2");
  assert.equal(result.value.items[0]?.currentText, "Slide 1");
  assert.notEqual(slide2Items[0]?.id, result.value.items[0]?.id);
});

test("persistCrawledPage rejects a page on a different domain", async () => {
  const repos = createMemoryRepositories();
  const project = await saveTestProject(repos, "https://youroffer.now.com");
  const result = await persistCrawledPage(
    {
      projectId: project.id,
      sourceUrl: "https://other.example/about",
      sanitizedHtml: "<html><body><p>Nope</p></body></html>",
      items: [],
    },
    repos,
  );

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.equal(result.error.code, "DOMAIN_MISMATCH");
});

test("persistCrawledPage recrawls the same path without creating a second page", async () => {
  const repos = createMemoryRepositories();
  const project = await saveTestProject(repos);
  const first = await persistCrawledPage(
    {
      projectId: project.id,
      sourceUrl: "https://example.com/about/",
      sanitizedHtml: "<html><body><h1>About</h1></body></html>",
      items: [
        {
          id: "content_0123456789abcdef0123456789abcdef",
          elementType: "h1",
          text: "About",
          selector: "h1",
          direction: "ltr",
          order: 0,
          mapped: true,
        },
      ],
    },
    repos,
  );
  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }

  const second = await persistCrawledPage(
    {
      projectId: project.id,
      sourceUrl: "https://example.com/about",
      sanitizedHtml: "<html><body><h1>About us</h1></body></html>",
      items: [
        {
          id: "content_0123456789abcdef0123456789abcdef",
          elementType: "h1",
          text: "About us",
          selector: "h1",
          direction: "ltr",
          order: 0,
          mapped: true,
        },
      ],
    },
    repos,
  );
  assert.equal(second.ok, true);
  if (!second.ok) {
    return;
  }

  assert.equal(second.value.page.id, first.value.page.id);
  assert.notEqual(second.value.page.snapshotId, first.value.page.snapshotId);
  assert.equal((await repos.pages.listByProject(project.id)).length, 1);
  const items = await repos.contentItems.listByPage(second.value.page.id);
  assert.equal(items[0]?.currentText, "About us");
});
