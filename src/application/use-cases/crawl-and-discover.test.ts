import assert from "node:assert/strict";
import { test } from "node:test";

import type { DynamicDiscoverer } from "../ports/discovery.ts";
import type { SnapshotBuilder } from "../ports/snapshot.ts";
import { createHtmlExtractor } from "../../server/extraction/extract-page.ts";
import { crawlAndDiscoverSnapshot } from "./crawl-and-discover.ts";

test("crawlAndDiscoverSnapshot snapshots each distinct state and namespaces ids", async () => {
  const discoverer: DynamicDiscoverer = {
    async discover() {
      return {
        ok: true,
        value: {
          finalUrl: "https://example.com/dynamic",
          unsupported: [],
          captures: [
            {
              type: "default",
              key: "default",
              label: "Default",
              html: `<html><body><h1>Home</h1><p>Carousel slide 1 copy</p></body></html>`,
            },
            {
              type: "carousel",
              key: "carousel:slide-2",
              label: "Slide 2",
              html: `<html><body><h1>Home</h1><p>Carousel slide 2 copy</p></body></html>`,
            },
            {
              type: "carousel",
              key: "carousel:slide-dup",
              label: "Duplicate",
              html: `<html><body><h1>Home</h1><p>Carousel slide 1 copy</p></body></html>`,
            },
          ],
        },
      };
    },
  };

  const builder: SnapshotBuilder = {
    async build(input) {
      return {
        ok: true,
        value: {
          sanitizedHtml: input.html,
          documentDirection: input.documentDirection,
          items: input.items.map((item) => ({ ...item, mapped: true })),
          ...(input.title === undefined ? {} : { title: input.title }),
        },
      };
    },
  };

  const result = await crawlAndDiscoverSnapshot(
    { source: "url", url: "https://example.com/dynamic" },
    discoverer,
    createHtmlExtractor(),
    builder,
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.states.length, 2);
  assert.equal(result.value.states[0]?.key, "default");
  assert.equal(result.value.states[1]?.key, "carousel:slide-2");
  assert.match(result.value.states[1]?.items[1]?.text ?? "", /slide 2/);
  assert.notEqual(result.value.states[0]?.items[0]?.id, result.value.states[1]?.items[0]?.id);
  assert.equal("body" in result.value, false);
});

test("crawlAndDiscoverSnapshot reports authentication-only pages", async () => {
  const discoverer: DynamicDiscoverer = {
    async discover() {
      return {
        ok: true,
        value: {
          finalUrl: "https://example.com/login",
          unsupported: [
            {
              kind: "authentication",
              message: "Sign-in or password fields are not completed during discovery.",
            },
          ],
          captures: [
            {
              type: "default",
              key: "default",
              html: `<html><body><form><input type="password" name="p" /></form></body></html>`,
            },
          ],
        },
      };
    },
  };

  const result = await crawlAndDiscoverSnapshot(
    { source: "url", url: "https://example.com/login" },
    discoverer,
    createHtmlExtractor(),
    {
      async build(input) {
        return {
          ok: true,
          value: {
            sanitizedHtml: input.html,
            documentDirection: "ltr",
            items: input.items.map((item) => ({ ...item, mapped: true })),
          },
        };
      },
    },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "UNSUPPORTED_DYNAMIC_CONTENT");
  }
});

test("crawlAndDiscoverSnapshot preserves discovery security errors", async () => {
  const discoverer: DynamicDiscoverer = {
    async discover() {
      return {
        ok: false,
        error: { code: "SSRF_BLOCKED", message: "blocked" },
      };
    },
  };

  const result = await crawlAndDiscoverSnapshot(
    { source: "url", url: "http://127.0.0.1/" },
    discoverer,
    createHtmlExtractor(),
    {
      async build() {
        throw new Error("snapshot must not run after discovery failure");
      },
    },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "SSRF_BLOCKED");
  }
});
