import assert from "node:assert/strict";
import { test } from "node:test";

import { createId, isContentId, isId } from "./ids.ts";

test("isContentId accepts extraction hashes and UUID content ids", () => {
  assert.equal(isContentId("content_0123456789abcdef0123456789abcdef"), true);
  assert.equal(isContentId(createId("content")), true);
  assert.equal(isContentId(createId("page")), false);
  assert.equal(isContentId("content_not-a-hash"), false);
});

test("createId uses a stable prefix and a UUID", () => {
  const id = createId("project");

  assert.equal(isId(id, "project"), true);
  assert.match(id, /^project_[0-9a-f-]{36}$/i);
});

test("isId rejects the wrong prefix and malformed values", () => {
  const pageId = createId("page");

  assert.equal(isId(pageId, "project"), false);
  assert.equal(isId("page_not-a-uuid", "page"), false);
  assert.equal(isId("project"), false);
});
