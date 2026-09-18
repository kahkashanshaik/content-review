import assert from "node:assert/strict";
import { test } from "node:test";

import type { LookupFn } from "./dns.ts";
import { createHttpCrawler } from "./http-crawler.ts";
import type { HttpGet, PinnedHttpResponse } from "./http-get.ts";
import { DEFAULT_CRAWLER_LIMITS } from "./limits.ts";

const publicLookup: LookupFn = async () => [{ address: "93.184.216.34", family: 4 }];

test("http crawler follows redirects and re-validates each Location", async () => {
  const requests: string[] = [];
  const httpGet = scriptedGet([
    redirect(302, "https://cdn.example/page"),
    html(200, "<h1>ok</h1>"),
  ], requests);

  const crawler = createHttpCrawler({ lookup: publicLookup, httpGet });
  const result = await crawler.crawl({ url: "https://example.com/" });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.deepEqual(requests, ["https://example.com/", "https://cdn.example/page"]);
  assert.equal(result.value.finalUrl, "https://cdn.example/page");
  assert.equal(result.value.body, "<h1>ok</h1>");
});

test("http crawler blocks redirects to metadata and private addresses", async () => {
  for (const location of [
    "http://169.254.169.254/latest/meta-data/",
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://192.168.1.20/admin",
  ]) {
    const crawler = createHttpCrawler({
      lookup: publicLookup,
      httpGet: scriptedGet([redirect(302, location)]),
    });
    const result = await crawler.crawl({ url: "https://example.com/" });
    assert.equal(result.ok, false, location);
    if (!result.ok) {
      assert.equal(result.error.code, "SSRF_BLOCKED");
    }
  }
});

test("http crawler blocks protocol-relative redirects onto loopback", async () => {
  const crawler = createHttpCrawler({
    lookup: publicLookup,
    httpGet: scriptedGet([redirect(301, "//127.0.0.1/secret")]),
  });
  const result = await crawler.crawl({ url: "https://example.com/" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "SSRF_BLOCKED");
  }
});

test("http crawler enforces the redirect limit", async () => {
  const httpGet = scriptedGet([
    redirect(302, "https://example.com/a"),
    redirect(302, "https://example.com/b"),
    redirect(302, "https://example.com/c"),
  ]);
  const crawler = createHttpCrawler({
    lookup: publicLookup,
    httpGet,
    limits: { ...DEFAULT_CRAWLER_LIMITS, maxRedirects: 2 },
  });

  const result = await crawler.crawl({ url: "https://example.com/" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "TOO_MANY_REDIRECTS");
  }
});

test("http crawler rejects non-HTML content types", async () => {
  const crawler = createHttpCrawler({
    lookup: publicLookup,
    httpGet: scriptedGet([
      {
        status: 200,
        headers: { "content-type": "application/json" },
        body: Buffer.from("{}", "utf8"),
      },
    ]),
  });

  const result = await crawler.crawl({ url: "https://example.com/" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "NOT_HTML");
  }
});

test("http crawler maps oversized responses", async () => {
  const crawler = createHttpCrawler({
    lookup: publicLookup,
    httpGet: async () => ({
      ok: false,
      error: {
        code: "RESPONSE_TOO_LARGE",
        message: "The response exceeded the maximum allowed size.",
      },
    }),
  });

  const result = await crawler.crawl({ url: "https://example.com/" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "RESPONSE_TOO_LARGE");
  }
});

test("http crawler maps timeouts", async () => {
  const crawler = createHttpCrawler({
    lookup: publicLookup,
    httpGet: async () => ({
      ok: false,
      error: { code: "REQUEST_TIMEOUT", message: "The crawl request timed out." },
    }),
  });

  const result = await crawler.crawl({ url: "https://example.com/" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "REQUEST_TIMEOUT");
  }
});

test("http crawler pins the authorized IP on the HTTP request", async () => {
  let pinned: string | undefined;
  const httpGet: HttpGet = async (request) => {
    pinned = request.pinnedAddress;
    return {
      ok: true,
      value: html(200, "<p>hi</p>"),
    };
  };

  const crawler = createHttpCrawler({ lookup: publicLookup, httpGet });
  const result = await crawler.crawl({ url: "https://example.com/" });

  assert.equal(result.ok, true);
  assert.equal(pinned, "93.184.216.34");
});

test("http crawler does not execute JavaScript in the response body", async () => {
  const crawler = createHttpCrawler({
    lookup: publicLookup,
    httpGet: scriptedGet([html(200, '<script>globalThis.__pwned = true</script><h1>Title</h1>')]),
  });

  const result = await crawler.crawl({ url: "https://example.com/" });
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal("__pwned" in globalThis, false);
  assert.match(result.value.body, /<script>/);
});

function scriptedGet(
  responses: PinnedHttpResponse[],
  requests: string[] = [],
): HttpGet {
  let index = 0;
  return async (request) => {
    requests.push(request.url.href);
    const response = responses[index];
    index += 1;
    if (response === undefined) {
      throw new Error(`Unexpected request for ${request.url.href}`);
    }
    return { ok: true, value: response };
  };
}

function redirect(status: number, location: string): PinnedHttpResponse {
  return {
    status,
    headers: { location },
    body: new Uint8Array(),
  };
}

function html(status: number, body: string): PinnedHttpResponse {
  return {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
    body: Buffer.from(body, "utf8"),
  };
}
