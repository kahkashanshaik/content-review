import assert from "node:assert/strict";
import { test } from "node:test";

import { sanitizeCss } from "./css.ts";

const BASE = "https://example.com/page";

test("rewrites CSS urls and drops imports and javascript urls", () => {
  const css = `
    @import url("/evil.css");
    body { background: url(/bg.png); }
    a { background: url(javascript:alert(1)); }
  `;

  const sanitized = sanitizeCss(css, BASE);
  assert.equal(sanitized.includes("@import"), false);
  assert.match(sanitized, /https:\/\/example.com\/bg.png/);
  assert.match(sanitized, /url\("about:invalid"\)/);
  assert.equal(sanitized.includes("javascript"), false);
});

test("drops expression and binding declarations", () => {
  const sanitized = sanitizeCss(
    "body { width: expression(alert(1)); color: red; -moz-binding: url(https://example.com/x.xml); }",
    BASE,
  );
  assert.equal(sanitized.toLowerCase().includes("expression"), false);
  assert.equal(sanitized.toLowerCase().includes("-moz-binding"), false);
  assert.match(sanitized, /color:\s*red/);
});

test("neutralizes CSS unicode-escaped javascript urls", () => {
  const sanitized = sanitizeCss("p { background: url(\\6a avascript:alert(1)); }", BASE);
  assert.equal(sanitized.toLowerCase().includes("javascript"), false);
  assert.match(sanitized, /url\("about:invalid"\)/);
});
