import assert from "node:assert/strict";
import { test } from "node:test";

import { extractPageContent } from "./extract-page.ts";

test("preserves explicit html dir and lang", () => {
  const result = extractPageContent(
    `<html lang="ar" dir="rtl"><body><p>مرحبا</p></body></html>`,
  );
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.documentDirection, "rtl");
  assert.equal(result.value.documentLanguage, "ar");
  assert.equal(result.value.items[0]?.direction, "rtl");
  assert.equal(result.value.items[0]?.language, "ar");
  assert.equal(result.value.items[0]?.text, "مرحبا");
});

test("respects element-level dir inside an LTR page", () => {
  const result = extractPageContent(`
    <html dir="ltr" lang="en">
      <body>
        <p>Hello</p>
        <p dir="rtl" lang="ur">اردو متن 123 https://example.com !</p>
      </body>
    </html>
  `);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.documentDirection, "ltr");
  assert.equal(result.value.items[0]?.direction, "ltr");
  assert.equal(result.value.items[1]?.direction, "rtl");
  assert.equal(result.value.items[1]?.language, "ur");
  assert.match(result.value.items[1]?.text ?? "", /123/);
  assert.match(result.value.items[1]?.text ?? "", /https:\/\/example.com/);
});

test("uses inline CSS direction when dir is absent", () => {
  const result = extractPageContent(
    `<html><body><p style="direction: rtl; unicode-bidi: isolate">שלום</p></body></html>`,
  );
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.items[0]?.direction, "rtl");
});

test("detects RTL from Arabic, Hebrew, or Persian text when metadata is missing", () => {
  const result = extractPageContent(
    `<html><body><p>עברית</p><p>Latin title</p><p>سلام دنیا</p></body></html>`,
  );
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.items[0]?.direction, "rtl");
  assert.equal(result.value.items[1]?.direction, "ltr");
  assert.equal(result.value.items[2]?.direction, "rtl");
});

test("detects RTL text inside an LTR document without element dir", () => {
  const result = extractPageContent(`
    <html dir="ltr" lang="en">
      <body>
        <p>Hello</p>
        <p>שלום</p>
      </body>
    </html>
  `);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.documentDirection, "ltr");
  assert.equal(result.value.items[0]?.direction, "ltr");
  assert.equal(result.value.items[1]?.direction, "rtl");
});

test("respects wrapping element dir over text detection", () => {
  const result = extractPageContent(`
    <html dir="ltr">
      <body>
        <div dir="rtl"><p>Hello</p></div>
      </body>
    </html>
  `);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.items[0]?.direction, "rtl");
});

test("does not assume an RTL document is uniformly RTL", () => {
  const result = extractPageContent(`
    <html dir="rtl" lang="ar">
      <body>
        <p>مرحبا</p>
        <p>Hello</p>
      </body>
    </html>
  `);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.documentDirection, "rtl");
  assert.equal(result.value.items[0]?.direction, "rtl");
  assert.equal(result.value.items[1]?.direction, "ltr");
});
