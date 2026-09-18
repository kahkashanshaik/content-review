import assert from "node:assert/strict";
import { test } from "node:test";

import { extractPageContent } from "../extraction/extract-page.ts";
import { buildSnapshot } from "./build-snapshot.ts";
import { CONTENT_ID_ATTRIBUTE, SNAPSHOT_CSP } from "./document.ts";
import { PREVIEW_FIXTURE_BASE_URL, PREVIEW_FIXTURE_HTML } from "./preview-fixture.ts";
import { createNoopStylesheetFetcher } from "./stylesheets.ts";

const BASE = "https://example.com/page";

test("removes scripts, event handlers, unsafe embeds, and form actions", async () => {
  const html = `<!DOCTYPE html>
    <html lang="en" dir="ltr">
      <head>
        <script>window.x = 1</script>
        <meta http-equiv="refresh" content="0;url=https://evil.example" />
      </head>
      <body>
        <h1 onclick="alert(1)" onmouseover="alert(2)">Hello</h1>
        <a href="javascript:alert(1)">Click</a>
        <img src="x" onerror="alert(1)" />
        <iframe src="https://example.com"></iframe>
        <form action="https://evil.example/steal"><button>Go</button></form>
      </body>
    </html>`;

  const extracted = extractPageContent(html);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html,
      baseUrl: BASE,
      items: extracted.value.items,
      documentDirection: extracted.value.documentDirection,
      ...(extracted.value.documentLanguage === undefined
        ? {}
        : { documentLanguage: extracted.value.documentLanguage }),
      ...(extracted.value.title === undefined ? {} : { title: extracted.value.title }),
    },
    createNoopStylesheetFetcher(),
  );

  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  const output = snapshot.value.sanitizedHtml;
  assert.equal(/<script/i.test(output), false);
  assert.equal(/onerror=/i.test(output), false);
  assert.equal(/onclick=/i.test(output), false);
  assert.equal(/javascript:/i.test(output), false);
  assert.equal(/<iframe/i.test(output), false);
  assert.equal(/http-equiv="refresh"/i.test(output), false);
  assert.equal(/action="https:\/\/evil/i.test(output), false);
  assert.match(output, new RegExp(SNAPSHOT_CSP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("maps extracted items onto sanitized elements by selector", async () => {
  const html = `<html><body><h1>Welcome</h1><p>Hello world</p></body></html>`;
  const extracted = extractPageContent(html);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html,
      baseUrl: BASE,
      items: extracted.value.items,
      documentDirection: extracted.value.documentDirection,
    },
    createNoopStylesheetFetcher(),
  );

  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  assert.equal(snapshot.value.items.every((item) => item.mapped), true);
  const heading = snapshot.value.items[0];
  assert.ok(heading);
  assert.match(
    snapshot.value.sanitizedHtml,
    new RegExp(`${CONTENT_ID_ATTRIBUTE}="${heading.id}"`),
  );
  assert.match(snapshot.value.sanitizedHtml, /data-content-type="h1"/);
});

test("rewrites image assets and drops private or scripted sources", async () => {
  const html = `<html><body>
    <p>Photo</p>
    <img src="/hero.png" srcset="/a.png 1x, http://127.0.0.1/b.png 2x" />
  </body></html>`;
  const extracted = extractPageContent(html);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html,
      baseUrl: BASE,
      items: extracted.value.items,
      documentDirection: "ltr",
    },
    createNoopStylesheetFetcher(),
  );

  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  assert.match(snapshot.value.sanitizedHtml, /src="https:\/\/example.com\/hero.png"/);
  assert.match(snapshot.value.sanitizedHtml, /https:\/\/example.com\/a.png 1x/);
  assert.equal(snapshot.value.sanitizedHtml.includes("127.0.0.1"), false);
});

test("preview fixture sanitizes XSS payloads and keeps mixed-direction text", async () => {
  const extracted = extractPageContent(PREVIEW_FIXTURE_HTML);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html: PREVIEW_FIXTURE_HTML,
      baseUrl: PREVIEW_FIXTURE_BASE_URL,
      items: extracted.value.items,
      documentDirection: extracted.value.documentDirection,
      ...(extracted.value.documentLanguage === undefined
        ? {}
        : { documentLanguage: extracted.value.documentLanguage }),
      ...(extracted.value.title === undefined ? {} : { title: extracted.value.title }),
    },
    createNoopStylesheetFetcher(),
  );

  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  assert.equal(/<script/i.test(snapshot.value.sanitizedHtml), false);
  assert.equal(/javascript:/i.test(snapshot.value.sanitizedHtml), false);
  assert.match(snapshot.value.sanitizedHtml, /Isolated fixture heading/);
  assert.match(snapshot.value.sanitizedHtml, /مرحبا/);
  const arabic = snapshot.value.items.find((item) => item.language === "ar");
  assert.equal(arabic?.direction, "rtl");
  assert.equal(arabic?.mapped, true);
  assert.match(snapshot.value.sanitizedHtml, /dir="rtl"/);
  assert.match(snapshot.value.sanitizedHtml, /lang="he"/);
  assert.match(snapshot.value.sanitizedHtml, /سلام دنیا/);
  assert.match(snapshot.value.sanitizedHtml, /unicode-bidi:\s*isolate/);
  assert.match(snapshot.value.sanitizedHtml, /text-align:\s*start/);
  const hebrewUndeclared = snapshot.value.items.find((item) =>
    item.text.includes("without explicit dir"),
  );
  assert.equal(hebrewUndeclared?.direction, "rtl");
  assert.equal(hebrewUndeclared?.mapped, true);
});

test("preserves element dir, lang, and bidi CSS and stamps missing dir from extraction", async () => {
  const html = `<html dir="ltr" lang="en"><body>
    <p dir="rtl" lang="ar" style="direction: rtl; text-align: start; unicode-bidi: isolate">مرحبا 123</p>
    <p>שלום</p>
  </body></html>`;
  const extracted = extractPageContent(html);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html,
      baseUrl: BASE,
      items: extracted.value.items,
      documentDirection: extracted.value.documentDirection,
    },
    createNoopStylesheetFetcher(),
  );

  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  assert.match(snapshot.value.sanitizedHtml, /dir="rtl"/);
  assert.match(snapshot.value.sanitizedHtml, /lang="ar"/);
  assert.match(snapshot.value.sanitizedHtml, /unicode-bidi:\s*isolate/);
  assert.match(snapshot.value.sanitizedHtml, /text-align:\s*start/);
  const hebrew = snapshot.value.items.find((item) => item.text === "שלום");
  assert.equal(hebrew?.direction, "rtl");
  assert.equal(hebrew?.mapped, true);
  assert.match(
    snapshot.value.sanitizedHtml,
    new RegExp(`${CONTENT_ID_ATTRIBUTE}="${hebrew?.id}"[^>]*dir="rtl"|dir="rtl"[^>]*${CONTENT_ID_ATTRIBUTE}="${hebrew?.id}"`),
  );
});

test("preserves hidden attributes so inactive states stay visually hidden", async () => {
  const html = `<html><body><p>Visible</p><div hidden><p>Hidden slide</p></div></body></html>`;
  const extracted = extractPageContent(html);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html,
      baseUrl: BASE,
      items: extracted.value.items,
      documentDirection: "ltr",
    },
    createNoopStylesheetFetcher(),
  );
  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  assert.match(snapshot.value.sanitizedHtml, /hidden/);
  assert.equal(snapshot.value.items.some((item) => item.text === "Hidden slide"), false);
  assert.equal(snapshot.value.items.some((item) => item.text === "Visible"), true);
});

test("freezes swiper layout CSS so slides stay visible without page scripts", async () => {
  const html = `<html><head></head><body>
    <div class="swiper">
      <div class="swiper-wrapper" style="transform: translate3d(-800px, 0px, 0px)">
        <div class="swiper-slide"><h2>Faster Delivery</h2></div>
        <div class="swiper-slide"><h2>Better Decisions</h2></div>
      </div>
    </div>
    <script>window.swiper = true</script>
  </body></html>`;
  const extracted = extractPageContent(html);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html,
      baseUrl: BASE,
      items: extracted.value.items,
      documentDirection: "ltr",
    },
    createNoopStylesheetFetcher(),
  );
  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  assert.equal(/<script/i.test(snapshot.value.sanitizedHtml), false);
  assert.match(snapshot.value.sanitizedHtml, /data-snapshot-freeze-layout="true"/);
  assert.match(snapshot.value.sanitizedHtml, /transform:\s*none\s*!important/);
  assert.match(snapshot.value.sanitizedHtml, /Faster Delivery/);
  assert.match(snapshot.value.sanitizedHtml, /Better Decisions/);
});

test("hides closed Elementor off-canvas overlays so they cannot overlap page content", async () => {
  const html = `<html><body>
    <div class="e-off-canvas" role="dialog" aria-hidden="true" inert="">
      <h2>ADMISSIONS</h2>
      <ul><li>Register now</li></ul>
    </div>
    <h2>Self-esteem & life skills</h2>
  </body></html>`;
  const extracted = extractPageContent(html);
  assert.equal(extracted.ok, true);
  if (!extracted.ok) {
    return;
  }

  const snapshot = await buildSnapshot(
    {
      html,
      baseUrl: BASE,
      items: extracted.value.items,
      documentDirection: "ltr",
    },
    createNoopStylesheetFetcher(),
  );

  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) {
    return;
  }

  assert.match(
    snapshot.value.sanitizedHtml,
    /class="e-off-canvas"[^>]*hidden|hidden[^>]*class="e-off-canvas"/,
  );
  assert.equal(snapshot.value.items.some((item) => item.text === "ADMISSIONS"), false);
  assert.equal(snapshot.value.items.some((item) => item.text === "Self-esteem & life skills"), true);
});
