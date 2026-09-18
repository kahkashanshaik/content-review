import assert from "node:assert/strict";
import { test } from "node:test";

import { createId } from "../../domain/ids.ts";
import { createPage } from "./create-page.ts";

test("createPage builds a page with a distinct snapshot id", () => {
  const projectId = createId("project");
  const result = createPage(
    { projectId, sourceUrl: "https://example.com/about" },
    () => "2026-09-09T00:00:00.000Z",
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.projectId, projectId);
  assert.equal(result.value.sourceUrl, "https://example.com/about");
  assert.match(result.value.id, /^page_/);
  assert.match(result.value.snapshotId, /^snapshot_/);
  assert.equal(result.value.snapshotId === result.value.id, false);
});

test("createPage does not fetch the source URL", () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("network should not be used");
  };

  try {
    const result = createPage({
      projectId: createId("project"),
      sourceUrl: "https://127.0.0.1/secret",
    });

    assert.equal(result.ok, true);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createPage rejects an empty URL without contacting the network", () => {
  const result = createPage({
    projectId: createId("project"),
    sourceUrl: " ",
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.equal(result.error.code, "INVALID_URL");
});
