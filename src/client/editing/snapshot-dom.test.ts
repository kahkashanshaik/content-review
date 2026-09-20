import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHTML } from "linkedom";

import { CONTENT_EDITED_ATTRIBUTE } from "../../domain/content-attributes.ts";
import type { ContentItem } from "../../domain/types.ts";
import { applyCurrentText, hydrateUneditedText, isSnapshotElement, readEditedText, readVisibleText } from "./snapshot-dom.ts";

test("isSnapshotElement accepts iframe-like element shapes", () => {
  const node = {
    nodeType: 1,
    textContent: "Hello",
    getAttribute() {
      return null;
    },
    setAttribute() {},
    removeAttribute() {},
    closest() {
      return null;
    },
    focus() {},
  };

  assert.equal(isSnapshotElement(node), true);
  assert.equal(isSnapshotElement({ nodeType: 3 }), false);
});

test("applyCurrentText writes plain text and marks edited nodes", () => {
  const { document } = parseHTML(
    `<html><body><h1 data-content-id="content_0123456789abcdef0123456789abcdef">Hello</h1></body></html>`,
  );
  const item: ContentItem = {
    id: "content_0123456789abcdef0123456789abcdef",
    pageId: "page_1",
    stateId: "state_1",
    elementType: "h1",
    originalText: "Hello",
    currentText: "<img src=x onerror=alert(1)>",
    order: 0,
  };

  applyCurrentText(document, [item]);
  const node = document.querySelector('[data-content-id="content_0123456789abcdef0123456789abcdef"]');
  assert.equal(node?.textContent, "<img src=x onerror=alert(1)>");
  assert.equal(node?.getAttribute(CONTENT_EDITED_ATTRIBUTE), "true");
  assert.equal(node?.innerHTML.includes("<img"), false);
});

test("applyCurrentText keeps unedited nested markup and stamps dir", () => {
  const { document } = parseHTML(
    `<html><body><p data-content-id="content_0123456789abcdef0123456789abcdef">Hello <a href="/x">world</a></p></body></html>`,
  );
  const item: ContentItem = {
    id: "content_0123456789abcdef0123456789abcdef",
    pageId: "page_1",
    stateId: "state_1",
    elementType: "p",
    originalText: "Hello world",
    currentText: "Hello world",
    direction: "ltr",
    order: 0,
  };

  applyCurrentText(document, [item]);
  const node = document.querySelector('[data-content-id="content_0123456789abcdef0123456789abcdef"]');
  assert.equal(node?.querySelector("a")?.textContent, "world");
  assert.equal(node?.getAttribute("dir"), "ltr");
});

test("edited RTL text isolates URLs and numbers with bdi", () => {
  const { document } = parseHTML(
    `<html><body><p data-content-id="content_0123456789abcdef0123456789abcdef">مرحبا</p></body></html>`,
  );
  const item: ContentItem = {
    id: "content_0123456789abcdef0123456789abcdef",
    pageId: "page_1",
    stateId: "state_1",
    elementType: "p",
    originalText: "مرحبا",
    currentText: "مرحبا 123 https://example.com",
    direction: "rtl",
    language: "ar",
    order: 0,
  };

  applyCurrentText(document, [item]);
  const node = document.querySelector('[data-content-id="content_0123456789abcdef0123456789abcdef"]');
  assert.equal(node?.getAttribute("dir"), "rtl");
  assert.equal(node?.getAttribute("lang"), "ar");
  assert.ok(node);
  const isolates = [...node.querySelectorAll("bdi")].map((entry) => [
    entry.getAttribute("dir"),
    entry.textContent,
  ]);
  assert.equal(isolates.some((entry) => entry[0] === "ltr" && entry[1]?.includes("123")), true);
  assert.equal(isolates.some((entry) => entry[0] === "ltr" && entry[1]?.includes("https://example.com")), true);
});

test("readEditedText collapses whitespace and strips nulls", () => {
  const { document } = parseHTML(`<html><body><p data-content-id="x">A\u0000  B</p></body></html>`);
  const node = document.querySelector("[data-content-id=x]");
  assert.ok(node);
  assert.equal(readEditedText(node), "A B");
});

test("hydrateUneditedText uses dropdown trigger text instead of merged submenu copy", () => {
  const { document } = parseHTML(`<html><body>
    <li data-content-id="content_0123456789abcdef0123456789abcdef" class="menu-item-has-children">
      <a href="#">About TIS<span class="sub-arrow"></span></a>
      <ul class="sub-menu">
        <li><a href="/about">About Us</a></li>
        <li><a href="/history">Our History</a></li>
      </ul>
    </li>
  </body></html>`);
  const node = document.querySelector("[data-content-id]");
  assert.ok(node);

  const item: ContentItem = {
    id: "content_0123456789abcdef0123456789abcdef",
    pageId: "page_1",
    stateId: "state_1",
    elementType: "li",
    originalText: "About TIS About Us Our History",
    currentText: "About TIS About Us Our History",
    order: 0,
  };

  const hydrated = hydrateUneditedText(node, item);
  assert.equal(hydrated.originalText, "About TIS");
  assert.equal(hydrated.currentText, "About TIS");
});

test("applyCurrentText updates a dropdown label without flattening submenu items", () => {
  const { document } = parseHTML(`<html><body>
    <li data-content-id="content_0123456789abcdef0123456789abcdef" class="menu-item-has-children">
      <a href="#" class="elementor-item">About TIS<span class="sub-arrow">v</span></a>
      <ul class="sub-menu">
        <li><a href="/about">About Us</a></li>
        <li><a href="/history">Our History</a></li>
      </ul>
    </li>
  </body></html>`);
  const item: ContentItem = {
    id: "content_0123456789abcdef0123456789abcdef",
    pageId: "page_1",
    stateId: "state_1",
    elementType: "li",
    originalText: "About TIS About Us Our History",
    currentText: "About TISS",
    order: 0,
  };

  applyCurrentText(document, [item]);
  const node = document.querySelector("[data-content-id]");
  assert.ok(node);
  const trigger = node.querySelector("a.elementor-item");
  assert.equal(trigger?.childNodes[0]?.textContent, "About TISS");
  assert.equal(trigger?.querySelector(".sub-arrow")?.textContent, "v");
  assert.deepEqual(
    [...node.querySelectorAll(".sub-menu a")].map((entry) => entry.textContent),
    ["About Us", "Our History"],
  );
});

test("readVisibleText treats br as a space so wrapped headings are not merged", () => {
  const { document } = parseHTML(
    `<html><body><h1 data-content-id="x">A tradition of<br>learning with purpose</h1></body></html>`,
  );
  const node = document.querySelector("[data-content-id=x]");
  assert.ok(node);
  assert.equal(readVisibleText(node), "A tradition of learning with purpose");

  const item: ContentItem = {
    id: "content_0123456789abcdef0123456789abcdef",
    pageId: "page_1",
    stateId: "state_1",
    elementType: "h1",
    originalText: "A tradition oflearning with purpose",
    currentText: "A tradition oflearning with purpose",
    order: 0,
  };
  const hydrated = hydrateUneditedText(node, item);
  assert.equal(hydrated.originalText, "A tradition of learning with purpose");
  assert.equal(hydrated.currentText, "A tradition of learning with purpose");
});
