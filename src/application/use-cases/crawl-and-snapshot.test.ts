import assert from "node:assert/strict";
import { test } from "node:test";

import type { Crawler } from "../ports/crawler.ts";
import type { SnapshotBuilder } from "../ports/snapshot.ts";
import { createHtmlExtractor } from "../../server/extraction/extract-page.ts";
import { crawlAndSnapshot } from "./crawl-and-snapshot.ts";

test("crawlAndSnapshot returns sanitized HTML and mapped items without the raw body", async () => {
  const crawler: Crawler = {
    async crawl() {
      return {
        ok: true,
        value: {
          finalUrl: "https://example.com/",
          status: 200,
          contentType: "text/html",
          body: `<html><head><title>Demo</title><script>alert(1)</script></head><body><h1 onclick="x()">Hello</h1></body></html>`,
          byteLength: 80,
        },
      };
    },
  };

  const builder: SnapshotBuilder = {
    async build(input) {
      return {
        ok: true,
        value: {
          sanitizedHtml: `<!DOCTYPE html><html><body><h1 data-content-id="${input.items[0]?.id ?? ""}">Hello</h1></body></html>`,
          documentDirection: input.documentDirection,
          items: input.items.map((item) => ({ ...item, mapped: true })),
          ...(input.title === undefined ? {} : { title: input.title }),
        },
      };
    },
  };

  const result = await crawlAndSnapshot(
    { url: "https://example.com/" },
    crawler,
    createHtmlExtractor(),
    builder,
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.finalUrl, "https://example.com/");
  assert.equal(result.value.title, "Demo");
  assert.equal("body" in result.value, false);
  assert.match(result.value.sanitizedHtml, /data-content-id=/);
  assert.equal(result.value.items[0]?.mapped, true);
  assert.equal(result.value.sanitizedHtml.includes("<script>"), false);
});

test("crawlAndSnapshot preserves crawler security errors", async () => {
  const crawler: Crawler = {
    async crawl() {
      return {
        ok: false,
        error: { code: "SSRF_BLOCKED", message: "blocked" },
      };
    },
  };

  const result = await crawlAndSnapshot(
    { url: "http://127.0.0.1/" },
    crawler,
    createHtmlExtractor(),
    {
      async build() {
        throw new Error("snapshot must not run after a crawl failure");
      },
    },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "SSRF_BLOCKED");
  }
});
