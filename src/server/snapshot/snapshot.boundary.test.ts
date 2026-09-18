import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const directory = dirname(fileURLToPath(import.meta.url));

test("snapshot barrel is marked server-only", () => {
  const source = readFileSync(join(directory, "index.ts"), "utf8");
  assert.match(source, /import ["']server-only["']/);
  assert.match(source, /createHtmlSnapshotBuilder/);
  assert.doesNotMatch(source, /playwright/i);
});

test("isolated snapshot iframe forbids scripts", () => {
  const isolated = readFileSync(
    join(directory, "..", "..", "client", "snapshot", "isolated-snapshot.tsx"),
    "utf8",
  );
  const frame = readFileSync(
    join(directory, "..", "..", "client", "snapshot", "snapshot-frame.tsx"),
    "utf8",
  );

  assert.match(isolated, /sandbox=""/);
  assert.doesNotMatch(isolated, /allow-scripts/);
  assert.doesNotMatch(frame, /allow-scripts/);
  assert.match(frame, /referrerPolicy="no-referrer"/);
});

test("editable snapshot iframe allows same-origin parent access without scripts", () => {
  const source = readFileSync(
    join(directory, "..", "..", "client", "editing", "editable-snapshot.tsx"),
    "utf8",
  );

  assert.match(source, /sandbox="allow-same-origin"/);
  assert.doesNotMatch(source, /allow-scripts/);
});
