import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCrawlUrl } from "./url.ts";

test("parseCrawlUrl accepts http and https", () => {
  assert.equal(parseCrawlUrl("https://example.com/path").ok, true);
  assert.equal(parseCrawlUrl("http://example.com").ok, true);
});

test("parseCrawlUrl rejects non-http schemes", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,<h1>x</h1>",
    "file:///etc/passwd",
    "ftp://example.com",
    "ws://example.com",
  ]) {
    const result = parseCrawlUrl(url);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "INVALID_URL");
    }
  }
});

test("parseCrawlUrl rejects credentials", () => {
  const result = parseCrawlUrl("https://user:secret@example.com");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "INVALID_URL");
  }
});

test("parseCrawlUrl rejects disallowed ports", () => {
  const result = parseCrawlUrl("https://example.com:8080");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "SSRF_BLOCKED");
    assert.equal(result.error.details?.reason, "port");
  }
});

test("parseCrawlUrl allows default https port", () => {
  const result = parseCrawlUrl("https://example.com:443/about");
  assert.equal(result.ok, true);
});

test("parseCrawlUrl rejects empty and malformed values", () => {
  assert.equal(parseCrawlUrl("   ").ok, false);
  assert.equal(parseCrawlUrl("not a url").ok, false);
});
