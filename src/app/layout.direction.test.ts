import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const directory = dirname(fileURLToPath(import.meta.url));

test("application chrome stays LTR and uses logical inset for skip link", () => {
  const source = readFileSync(join(directory, "layout.tsx"), "utf8");
  assert.match(source, /<html lang="en" dir="ltr">/);
  assert.match(source, /start-4/);
  assert.doesNotMatch(source, /dir="rtl"/);
});
