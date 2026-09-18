import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const directory = dirname(fileURLToPath(import.meta.url));

test("extraction barrel is marked server-only", () => {
  const source = readFileSync(join(directory, "index.ts"), "utf8");
  assert.match(source, /import ["']server-only["']/);
  assert.match(source, /createHtmlExtractor/);
  assert.doesNotMatch(source, /playwright/i);
});
