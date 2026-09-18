import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveChromiumExecutable } from "./chromium.ts";
import { createPlaywrightDiscoverer } from "./playwright-discoverer.ts";
import { DYNAMIC_FIXTURE_BASE_URL, DYNAMIC_FIXTURE_HTML } from "./dynamic-fixture.ts";

const chrome = resolveChromiumExecutable();

test(
  "playwright discovery captures carousel and tab states from the fixture",
  { skip: chrome === undefined },
  async () => {
    const discoverer = createPlaywrightDiscoverer(
      chrome === undefined ? {} : { executablePath: chrome },
    );
    const result = await discoverer.discover({
      source: "html",
      html: DYNAMIC_FIXTURE_HTML,
      baseUrl: DYNAMIC_FIXTURE_BASE_URL,
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    const keys = result.value.captures.map((capture) => capture.key);
    assert.equal(keys.includes("default"), true);
    assert.equal(keys.includes("carousel:slide-2"), true);
    assert.equal(keys.includes("tab:pricing"), true);

    const slide2 = result.value.captures.find((capture) => capture.key === "carousel:slide-2");
    assert.match(slide2?.html ?? "", /Carousel slide 2 copy/);
    assert.match(slide2?.html ?? "", /data-slide="1"[^>]*hidden|hidden[^>]*data-slide="1"/);

    const pricing = result.value.captures.find((capture) => capture.key === "tab:pricing");
    assert.match(pricing?.html ?? "", /Pricing tab content/);
  },
);

test("playwright discovery blocks localhost URLs before launching", async () => {
  const discoverer = createPlaywrightDiscoverer();
  const result = await discoverer.discover({ source: "url", url: "http://127.0.0.1/" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "SSRF_BLOCKED");
  }
});
