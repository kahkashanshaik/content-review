import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const directory = dirname(fileURLToPath(import.meta.url));

test("discovery barrel is marked server-only", () => {
  const source = readFileSync(join(directory, "index.ts"), "utf8");
  assert.match(source, /import ["']server-only["']/);
  assert.match(source, /createPlaywrightDiscoverer/);
});

test("playwright stays inside the discovery module", () => {
  const source = readFileSync(join(directory, "playwright-discoverer.ts"), "utf8");
  assert.match(source, /playwright-core/);
  assert.doesNotMatch(source, /from\s+["']@\/app/);
});
