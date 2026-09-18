import assert from "node:assert/strict";
import { test } from "node:test";

import { extractPageContent } from "./extract-page.ts";
import { stableContentId } from "./selector.ts";

const SAMPLE = `<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <title>Sample page</title>
    <meta name="description" content="secret metadata" />
    <script>window.__evil = true</script>
    <style>.x { color: red }</style>
  </head>
  <body>
    <h1>Welcome</h1>
    <p>Hello <a href="/about">world</a></p>
    <p><a href="/only">Only link</a></p>
    <ul>
      <li>One</li>
      <li>Two</li>
    </ul>
    <button>Save</button>
    <label>Email</label>
    <figure>
      <figcaption>A caption</figcaption>
    </figure>
    <blockquote>Quoted</blockquote>
    <noscript>No script text</noscript>
    <template><p>Hidden template</p></template>
    <svg><path d="M0 0 L10 10"></path><text>Icon</text></svg>
  </body>
</html>`;

test("extracts semantic elements and skips scripts, styles, metadata, and svg", () => {
  const result = extractPageContent(SAMPLE);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.title, "Sample page");
  assert.deepEqual(
    result.value.items.map((item) => [item.elementType, item.text]),
    [
      ["h1", "Welcome"],
      ["p", "Hello world"],
      ["p", "Only link"],
      ["li", "One"],
      ["li", "Two"],
      ["button", "Save"],
      ["label", "Email"],
      ["figcaption", "A caption"],
      ["blockquote", "Quoted"],
    ],
  );

  assert.equal(result.value.items.some((item) => item.text.includes("secret")), false);
  assert.equal(result.value.items.some((item) => item.text.includes("evil")), false);
  assert.equal(result.value.items.some((item) => item.text.includes("Hidden template")), false);
  assert.equal(result.value.items.some((item) => item.text.includes("M0 0")), false);
});

test("treats line-break tags as spaces so wrapped headings keep their words", () => {
  const result = extractPageContent(
    `<html><body><h1>A tradition of<br>learning with purpose</h1><p>Hello<br/>world</p></body></html>`,
  );
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.deepEqual(
    result.value.items.map((item) => item.text),
    ["A tradition of learning with purpose", "Hello world"],
  );
});

test("does not extract nested links separately from a parent paragraph", () => {
  const result = extractPageContent(SAMPLE);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const links = result.value.items.filter((item) => item.elementType === "a");
  assert.equal(links.length, 0);
});

test("extracts standalone links that are not inside another extractable element", () => {
  const result = extractPageContent(
    `<html><body><nav><a href="/home">Home</a><a href="/about">About</a></nav></body></html>`,
  );
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.deepEqual(
    result.value.items.map((item) => item.text),
    ["Home", "About"],
  );
});

test("stable ids depend on selector, not on text", () => {
  const first = extractPageContent(`<html><body><h1>Hello</h1></body></html>`);
  const second = extractPageContent(`<html><body><h1>Changed</h1></body></html>`);
  assert.equal(first.ok && second.ok, true);
  if (!first.ok || !second.ok) {
    return;
  }

  assert.equal(first.value.items[0]?.id, second.value.items[0]?.id);
  assert.equal(first.value.items[0]?.selector, second.value.items[0]?.selector);
  assert.equal(first.value.items[0]?.id, stableContentId(first.value.items[0]?.selector ?? ""));
});

test("different structure produces different ids", () => {
  const first = extractPageContent(`<html><body><h1>Hello</h1><p>x</p></body></html>`);
  const second = extractPageContent(`<html><body><p>x</p><h1>Hello</h1></body></html>`);
  assert.equal(first.ok && second.ok, true);
  if (!first.ok || !second.ok) {
    return;
  }

  assert.notEqual(first.value.items[0]?.id, second.value.items[0]?.id);
});

test("skips hidden, aria-hidden, closed dialog, and display:none content", () => {
  const result = extractPageContent(`<html><body>
    <p>Visible</p>
    <p hidden>Hidden attr</p>
    <p aria-hidden="true">Aria hidden</p>
    <p style="display: none">Inline hidden</p>
    <dialog><p>Closed dialog copy</p></dialog>
    <dialog open><p>Open dialog copy</p></dialog>
    <div hidden><p>Nested hidden</p></div>
  </body></html>`);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.deepEqual(
    result.value.items.map((item) => item.text),
    ["Visible", "Open dialog copy"],
  );
});

test("namespaces content ids by state without changing selectors", () => {
  const html = `<html><body><h1>Hello</h1></body></html>`;
  const first = extractPageContent(html);
  const namespaced = extractPageContent(html, { idNamespace: "carousel:slide-2" });
  assert.equal(first.ok && namespaced.ok, true);
  if (!first.ok || !namespaced.ok) {
    return;
  }

  assert.equal(first.value.items[0]?.selector, namespaced.value.items[0]?.selector);
  assert.notEqual(first.value.items[0]?.id, namespaced.value.items[0]?.id);
  assert.equal(
    namespaced.value.items[0]?.id,
    stableContentId(namespaced.value.items[0]?.selector ?? "", "carousel:slide-2"),
  );
});
