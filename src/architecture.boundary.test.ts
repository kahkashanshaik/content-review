import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const srcRoot = dirname(fileURLToPath(import.meta.url));

const INFRA_IMPORT = /from\s+["'](dexie|playwright|linkedom|ipaddr\.js|pg|next(?:\/|$)|server-only)["']|import\s+["']server-only["']/;

test("domain and application stay independent from infrastructure", () => {
  const files = [
    ...listSourceFiles(join(srcRoot, "domain")),
    ...listSourceFiles(join(srcRoot, "application")),
  ];

  assert.ok(files.length > 0);

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(
      INFRA_IMPORT.test(source),
      false,
      `${relative(srcRoot, file)} imports infrastructure`,
    );
  }
});

test("domain does not import application, server, or app routes", () => {
  for (const file of listSourceFiles(join(srcRoot, "domain"))) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /from\s+["'](?:\.\.\/)+application/);
    assert.doesNotMatch(source, /from\s+["'](?:\.\.\/)+server/);
    assert.doesNotMatch(source, /from\s+["'](?:\.\.\/)+app/);
    assert.doesNotMatch(source, /from\s+["']@\/(application|server|app)/);
  }
});

test("app UI and server code do not import Dexie", () => {
  const files = [
    ...listSourceFiles(join(srcRoot, "app")),
    ...listSourceFiles(join(srcRoot, "server")),
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /from\s+["']dexie["']/,
      `${relative(srcRoot, file)} imports Dexie`,
    );
  }
});

test("app UI does not use browser IndexedDB repositories", () => {
  for (const file of listSourceFiles(join(srcRoot, "app"))) {
    if (file.includes(`${sep}api${sep}`)) {
      continue;
    }

    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /getBrowserRepositories|from\s+["']@\/client\/persistence/,
      `${relative(srcRoot, file)} uses browser IndexedDB repositories`,
    );
  }
});

test("only API route handlers import the server crawler", () => {
  for (const file of listSourceFiles(join(srcRoot, "app"))) {
    if (file.includes(`${sep}api${sep}`)) {
      continue;
    }

    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /from\s+["']@\/server/,
      `${relative(srcRoot, file)} imports server crawler code`,
    );
  }
});

function listSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...listSourceFiles(path));
      continue;
    }

    if (
      (path.endsWith(".ts") || path.endsWith(".tsx")) &&
      !path.endsWith(".test.ts")
    ) {
      files.push(path);
    }
  }

  return files;
}
