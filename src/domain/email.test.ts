import assert from "node:assert/strict";
import { test } from "node:test";

import { isValidEmail, normalizeEmail } from "./email.ts";

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  Alex@Example.COM "), "alex@example.com");
});

test("isValidEmail accepts a simple address and rejects empty or spaced values", () => {
  assert.equal(isValidEmail("alex@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail("a @b.com"), false);
});
