import assert from "node:assert/strict";
import { test } from "node:test";

import type { Crawler } from "../ports/crawler.ts";
import { createHtmlExtractor } from "../../server/extraction/extract-page.ts";
import { crawlAndExtract } from "./crawl-and-extract.ts";

test("crawlAndExtract maps fetched HTML into extracted items without returning the raw body", async () => {
  const crawler: Crawler = {
    async crawl() {
      return {
        ok: true,
        value: {
          finalUrl: "https://example.com/",
          status: 200,
          contentType: "text/html",
          body: `<html><head><title>Demo</title></head><body><h1>Hello</h1><p>World</p></body></html>`,
          byteLength: 80,
        },
      };
    },
  };

  const result = await crawlAndExtract(
    { url: "https://example.com/" },
    crawler,
    createHtmlExtractor(),
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.finalUrl, "https://example.com/");
  assert.equal(result.value.title, "Demo");
  assert.deepEqual(
    result.value.items.map((item) => item.text),
    ["Hello", "World"],
  );
  assert.equal("body" in result.value, false);
});

test("crawlAndExtract preserves crawler security errors", async () => {
  const crawler: Crawler = {
    async crawl() {
      return {
        ok: false,
        error: { code: "SSRF_BLOCKED", message: "blocked" },
      };
    },
  };

  const result = await crawlAndExtract(
    { url: "http://127.0.0.1/" },
    crawler,
    createHtmlExtractor(),
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "SSRF_BLOCKED");
  }
});
