import assert from "node:assert/strict";
import { test } from "node:test";

import { decodeHtmlBody, isCssContentType, isHtmlContentType, isRedirectStatus } from "./content-type.ts";

test("isHtmlContentType allows html media types with parameters", () => {
  assert.equal(isHtmlContentType("text/html; charset=utf-8"), true);
  assert.equal(isHtmlContentType("application/xhtml+xml"), true);
  assert.equal(isHtmlContentType("application/json"), false);
  assert.equal(isHtmlContentType("text/plain"), false);
  assert.equal(isHtmlContentType(undefined), false);
});

test("isCssContentType allows stylesheet media types with parameters", () => {
  assert.equal(isCssContentType("text/css; charset=utf-8"), true);
  assert.equal(isCssContentType("text/html"), false);
  assert.equal(isCssContentType(undefined), false);
});

test("isRedirectStatus covers crawl-followed redirect codes", () => {
  assert.equal(isRedirectStatus(302), true);
  assert.equal(isRedirectStatus(308), true);
  assert.equal(isRedirectStatus(200), false);
  assert.equal(isRedirectStatus(404), false);
});

test("decodeHtmlBody treats markup as text", () => {
  const html = decodeHtmlBody(Buffer.from('<script>alert(1)</script>', "utf8"));
  assert.equal(html, '<script>alert(1)</script>');
});
