import assert from "node:assert/strict";
import { test } from "node:test";

import { segmentMixedText } from "./bidi.ts";

test("isolates numbers and URLs inside RTL text", () => {
  const segments = segmentMixedText("مرحبا 123 https://example.com !", "rtl");
  const isolated = segments.filter((segment) => segment.dir === "ltr").map((segment) => segment.text);

  assert.equal(segments.some((segment) => segment.text.includes("مرحبا") && segment.dir === undefined), true);
  assert.equal(isolated.some((text) => text.includes("123")), true);
  assert.equal(isolated.some((text) => text.includes("https://example.com")), true);
});

test("isolates Arabic inside an LTR sentence", () => {
  const segments = segmentMixedText("Contact مكتب support", "ltr");
  const arabic = segments.find((segment) => segment.text.includes("مكتب"));

  assert.equal(arabic?.dir, "rtl");
  assert.equal(segments.find((segment) => segment.text.includes("Contact"))?.dir, undefined);
});

test("keeps punctuation attached to surrounding inherited text", () => {
  const segments = segmentMixedText("Hello, world!", "ltr");
  assert.equal(segments.every((segment) => segment.dir === undefined), true);
});
