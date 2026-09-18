import assert from "node:assert/strict";
import { test } from "node:test";

import type { Crawler } from "../ports/crawler.ts";
import { requestCrawl } from "./request-crawl.ts";

test("requestCrawl rejects a missing URL without calling the crawler", async () => {
  let calls = 0;
  const crawler: Crawler = {
    async crawl() {
      calls += 1;
      throw new Error("crawler should not run");
    },
  };

  const result = await requestCrawl({ url: "  " }, crawler);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "INVALID_URL");
  }
  assert.equal(calls, 0);
});

test("requestCrawl delegates a valid URL to the injected crawler", async () => {
  const crawler: Crawler = {
    async crawl(request) {
      return {
        ok: true,
        value: {
          finalUrl: request.url,
          status: 200,
          contentType: "text/html",
          body: "<h1>ok</h1>",
          byteLength: 10,
        },
      };
    },
  };

  const result = await requestCrawl({ url: "https://example.com" }, crawler);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.finalUrl, "https://example.com");
  }
});
