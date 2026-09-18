import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertSameProjectHost,
  coercePagePathDraft,
  normalizePageUrl,
  pagePathFromUrl,
  parseWebsiteUrl,
  projectOriginFromUrl,
  resolveProjectPageInput,
} from "./origin.ts";

test("create origin from the main website URL and keep the host exact", () => {
  const parsed = parseWebsiteUrl("https://youroffer.now.com/en/home/");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  const origin = projectOriginFromUrl(parsed.value);
  assert.equal(origin.originUrl, "https://youroffer.now.com");
  assert.equal(origin.allowedHost, "youroffer.now.com");
  assert.equal(normalizePageUrl(parsed.value), "https://youroffer.now.com/en/home");
});

test("allows further paths on the same host including www when that is the project host", () => {
  const parsed = parseWebsiteUrl("https://www.example.com/about?ref=1");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  const allowed = assertSameProjectHost(parsed.value, "www.example.com");
  assert.equal(allowed.ok, true);
  assert.equal(normalizePageUrl(parsed.value), "https://www.example.com/about?ref=1");
});

test("rejects a different host, including a www mismatch", () => {
  const parsed = parseWebsiteUrl("https://www.example.com/about");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  const rejected = assertSameProjectHost(parsed.value, "example.com");
  assert.equal(rejected.ok, false);
  if (rejected.ok) {
    return;
  }

  assert.equal(rejected.error.code, "DOMAIN_MISMATCH");
});

test("rejects a subdomain of the project host", () => {
  const parsed = parseWebsiteUrl("https://blog.youroffer.now.com/");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  const rejected = assertSameProjectHost(parsed.value, "youroffer.now.com");
  assert.equal(rejected.ok, false);
});

test("resolveProjectPageInput joins a slash path onto the frozen origin", () => {
  const resolved = resolveProjectPageInput("https://youroffer.now.com", "/path-to-page");
  assert.equal(resolved.ok, true);
  if (!resolved.ok) {
    return;
  }

  assert.equal(resolved.value, "https://youroffer.now.com/path-to-page");
});

test("resolveProjectPageInput prefixes a missing slash and keeps query strings", () => {
  const resolved = resolveProjectPageInput("https://example.com", "about?ref=1");
  assert.equal(resolved.ok, true);
  if (!resolved.ok) {
    return;
  }

  assert.equal(resolved.value, "https://example.com/about?ref=1");
});

test("resolveProjectPageInput rejects a pasted URL on another host", () => {
  const resolved = resolveProjectPageInput("https://example.com", "https://other.example/about");
  assert.equal(resolved.ok, false);
  if (resolved.ok) {
    return;
  }

  assert.equal(resolved.error.code, "DOMAIN_MISMATCH");
});

test("resolveProjectPageInput rejects a protocol-relative host change", () => {
  const resolved = resolveProjectPageInput("https://example.com", "//other.example/about");
  assert.equal(resolved.ok, false);
});

test("coercePagePathDraft keeps a leading slash on typed slugs", () => {
  assert.equal(coercePagePathDraft(""), "/");
  assert.equal(coercePagePathDraft("about"), "/about");
  assert.equal(coercePagePathDraft("/path-to-page"), "/path-to-page");
});

test("pagePathFromUrl returns the slug users can edit", () => {
  const parsed = parseWebsiteUrl("https://tischools.standardtouch.com/en/about-us-en");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  assert.equal(pagePathFromUrl(parsed.value), "/en/about-us-en");
});
