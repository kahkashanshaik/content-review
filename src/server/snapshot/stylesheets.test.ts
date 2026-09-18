import assert from "node:assert/strict";
import { test } from "node:test";

import type { LookupFn } from "../crawler/dns.ts";
import type { HttpGet } from "../crawler/http-get.ts";
import { extractPageContent } from "../extraction/extract-page.ts";
import { buildSnapshot } from "./build-snapshot.ts";
import { createHttpStylesheetFetcher } from "./stylesheets.ts";

const publicLookup: LookupFn = async () => [{ address: "93.184.216.34", family: 4 }];

test("inlines authorized stylesheets and sanitizes their CSS", async () => {
  const httpGet: HttpGet = async (request) => {
    if (request.url.pathname === "/theme.css") {
      return {
        ok: true,
        value: {
          status: 200,
          headers: { "content-type": "text/css" },
          body: Buffer.from("body { background: url(/bg.png); } a { background: url(javascript:alert(1)); }", "utf8"),
        },
      };
    }

    return {
      ok: false,
      error: { code: "FETCH_FAILED", message: "unexpected" },
    };
  };

  const html = `<html><head><link rel="stylesheet" href="/theme.css" /></head><body><p>Hello</p></body></html>`;
  const extracted = extractPageContent(html);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html,
      baseUrl: "https://example.com/page",
      items: extracted.value.items,
      documentDirection: "ltr",
    },
    createHttpStylesheetFetcher({ lookup: publicLookup, httpGet }),
  );

  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  assert.equal(snapshot.value.sanitizedHtml.includes("<link"), false);
  assert.match(snapshot.value.sanitizedHtml, /data-snapshot-asset="stylesheet"/);
  assert.match(snapshot.value.sanitizedHtml, /https:\/\/example.com\/bg.png/);
  assert.equal(snapshot.value.sanitizedHtml.includes("javascript"), false);
});

test("drops stylesheets that resolve to private or metadata addresses", async () => {
  const lookup: LookupFn = async () => [{ address: "127.0.0.1", family: 4 }];
  const httpGet: HttpGet = async () => {
    throw new Error("stylesheet fetch must not run after SSRF denial");
  };

  const html = `<html><head><link rel="stylesheet" href="https://intranet.example/app.css" /></head><body><p>Hello</p></body></html>`;
  const extracted = extractPageContent(html);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html,
      baseUrl: "https://example.com/page",
      items: extracted.value.items,
      documentDirection: "ltr",
    },
    createHttpStylesheetFetcher({ lookup, httpGet }),
  );

  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  assert.equal(snapshot.value.sanitizedHtml.includes("intranet.example"), false);
  assert.equal(snapshot.value.sanitizedHtml.includes("<link"), false);
});

test("inlines more than ten stylesheets used by Elementor-style pages", async () => {
  const httpGet: HttpGet = async (request) => {
    return {
      ok: true,
      value: {
        status: 200,
        headers: { "content-type": "text/css" },
        body: Buffer.from(`.${request.url.pathname.slice(1, -4)} { display: block; }`, "utf8"),
      },
    };
  };

  const links = Array.from({ length: 12 }, (_, index) => {
    return `<link rel="stylesheet" href="/sheet-${index}.css" />`;
  }).join("");
  const html = `<html><head>${links}</head><body><p>Hello</p></body></html>`;
  const extracted = extractPageContent(html);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html,
      baseUrl: "https://example.com/page",
      items: extracted.value.items,
      documentDirection: "ltr",
    },
    createHttpStylesheetFetcher({ lookup: publicLookup, httpGet }),
  );

  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  const inlined = snapshot.value.sanitizedHtml.match(/data-snapshot-asset="stylesheet"/g) ?? [];
  assert.equal(inlined.length, 12);
  assert.match(snapshot.value.sanitizedHtml, /name="viewport"/);
});

test("preserves stylesheet media queries when inlining", async () => {
  const httpGet: HttpGet = async () => {
    return {
      ok: true,
      value: {
        status: 200,
        headers: { "content-type": "text/css" },
        body: Buffer.from(".hero { display: grid; }", "utf8"),
      },
    };
  };

  const html = `<html><head><link rel="stylesheet" href="/desktop.css" media="(min-width: 1025px)" /></head><body><p>Hello</p></body></html>`;
  const extracted = extractPageContent(html);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html,
      baseUrl: "https://example.com/page",
      items: extracted.value.items,
      documentDirection: "ltr",
    },
    createHttpStylesheetFetcher({ lookup: publicLookup, httpGet }),
  );

  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  assert.match(snapshot.value.sanitizedHtml, /media="\(min-width: 1025px\)"/);
  assert.equal(snapshot.value.sanitizedHtml.includes("<link"), false);
});

test("keeps page CSS instead of animation stylesheets when over the cap", async () => {
  const httpGet: HttpGet = async (request) => {
    const name = request.url.pathname.replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "");
    return {
      ok: true,
      value: {
        status: 200,
        headers: { "content-type": "text/css" },
        body: Buffer.from(`.${name} { display: block; }`, "utf8"),
      },
    };
  };

  const animations = Array.from({ length: 40 }, (_, index) => {
    return `<link rel="stylesheet" href="/animations/slide-${index}.css" />`;
  }).join("");
  const html = `<html><head>${animations}<link rel="stylesheet" href="/uploads/elementor/css/post-1293.css" /></head><body><p>Hello</p></body></html>`;
  const extracted = extractPageContent(html);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html,
      baseUrl: "https://example.com/page",
      items: extracted.value.items,
      documentDirection: "ltr",
    },
    createHttpStylesheetFetcher({ lookup: publicLookup, httpGet }),
  );

  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  assert.match(snapshot.value.sanitizedHtml, /post-1293/);
  const inlined = snapshot.value.sanitizedHtml.match(/data-snapshot-asset="stylesheet"/g) ?? [];
  assert.equal(inlined.length, 40);
});
