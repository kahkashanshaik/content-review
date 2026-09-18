import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const directory = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(directory, "../..");

test("review visual editor puts submit and copy actions in the top nav", () => {
  const toolbar = readFileSync(
    join(srcRoot, "client/review/visual-editor-toolbar.tsx"),
    "utf8",
  );
  assert.match(toolbar, /Copy preview link/);
  assert.match(toolbar, /Submit for review/);
  assert.match(toolbar, /bg-\[#5b4dff\]/);
  assert.match(toolbar, /LockedOriginPathField/);
  assert.match(toolbar, /visual-editor-url/);
  assert.match(toolbar, /readOnly/);
  assert.doesNotMatch(toolbar, /onPathChange/);
  assert.doesNotMatch(toolbar, /onOpenUrl/);
});

test("edit sidebar uses a direction-aware textarea instead of snapshot contenteditable", () => {
  const sidebar = readFileSync(join(srcRoot, "client/review/edit-sidebar.tsx"), "utf8");
  assert.match(sidebar, /<textarea/);
  assert.match(sidebar, /dir=\{direction\}/);
  assert.match(sidebar, /aria-label="Edit content"/);
  assert.match(sidebar, /Edit content/);

  const editor = readFileSync(join(srcRoot, "client/editing/editable-snapshot.tsx"), "utf8");
  assert.doesNotMatch(editor, /contenteditable/);
  assert.match(editor, /<EditSidebar/);
});

test("review page is full-bleed and hides the app header", () => {
  const page = readFileSync(join(srcRoot, "app/review/[pageId]/page.tsx"), "utf8");
  assert.match(page, /h-dvh/);
  assert.doesNotMatch(page, /max-w-6xl/);

  const header = readFileSync(join(srcRoot, "client/shell/app-header.tsx"), "utf8");
  assert.match(header, /pathname.startsWith\("\/review"\)/);
  assert.match(header, /pathname.startsWith\("\/invite"\)/);
});

test("project pages add further paths against a locked origin", () => {
  const pages = readFileSync(join(srcRoot, "app/projects/[projectId]/project-pages.tsx"), "utf8");
  assert.match(pages, /LockedOriginPathField/);
  assert.match(pages, /resolveProjectPageInput/);
  assert.match(pages, /awaitingReviewCount/);
  assert.match(pages, /Invite/);
  assert.match(pages, /Delete project/);
  assert.doesNotMatch(pages, /page\.title/);
  assert.doesNotMatch(pages, /type="url"/);

  const field = readFileSync(join(srcRoot, "client/origin/locked-origin-path-field.tsx"), "utf8");
  assert.match(field, /Project domain cannot be changed/);
  assert.match(field, /\/path-to-page/);
  assert.match(field, /Page path cannot be changed here/);
});

test("snapshot editor outlines selected text in the visual-editor purple", () => {
  const source = readFileSync(join(srcRoot, "client/editing/snapshot-dom.ts"), "utf8");
  assert.match(source, /#5b4dff/);
});
