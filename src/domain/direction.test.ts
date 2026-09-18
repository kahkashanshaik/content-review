import assert from "node:assert/strict";
import { test } from "node:test";

import { detectTextDirection, resolveParagraphDirection } from "./direction.ts";

test("detects Hebrew, Arabic, Persian, and Latin runs", () => {
  assert.equal(detectTextDirection("שלום"), "rtl");
  assert.equal(detectTextDirection("مرحبا"), "rtl");
  assert.equal(detectTextDirection("سلام"), "rtl");
  assert.equal(detectTextDirection("Hello"), "ltr");
  assert.equal(detectTextDirection("123 https://example.com"), "auto");
  assert.equal(detectTextDirection("*** 123"), "auto");
});

test("resolveParagraphDirection prefers explicit dir over detection", () => {
  assert.equal(resolveParagraphDirection("ltr", "مرحبا"), "ltr");
  assert.equal(resolveParagraphDirection("auto", "مرحبا"), "rtl");
  assert.equal(resolveParagraphDirection(undefined, "Hello"), "ltr");
});
