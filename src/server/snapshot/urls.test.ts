import assert from "node:assert/strict";
import { test } from "node:test";

import { rewritePageUrl, rewriteSrcset } from "./urls.ts";

const BASE = "https://example.com/dir/page";

test("rewrites relative resource URLs against the page base", () => {
  assert.equal(rewritePageUrl("/logo.png", BASE, "resource"), "https://example.com/logo.png");
  assert.equal(
    rewritePageUrl("../img/hero.jpg", BASE, "resource"),
    "https://example.com/img/hero.jpg",
  );
});

test("rejects javascript, data HTML, and private resource URLs", () => {
  assert.equal(rewritePageUrl("javascript:alert(1)", BASE, "navigation"), undefined);
  assert.equal(rewritePageUrl("javascript:alert(1)", BASE, "resource"), undefined);
  assert.equal(rewritePageUrl("data:text/html,<script>x</script>", BASE, "resource"), undefined);
  assert.equal(rewritePageUrl("http://127.0.0.1/logo.png", BASE, "resource"), undefined);
  assert.equal(rewritePageUrl("http://169.254.169.254/latest/meta-data", BASE, "resource"), undefined);
  assert.equal(rewritePageUrl("http://localhost/x", BASE, "resource"), undefined);
});

test("allows raster data images and navigation mailto or fragments", () => {
  const png = "data:image/png;base64,aaaa";
  assert.equal(rewritePageUrl(png, BASE, "resource"), png);
  assert.equal(rewritePageUrl("#intro", BASE, "navigation"), "#intro");
  assert.equal(rewritePageUrl("mailto:review@example.com", BASE, "navigation"), "mailto:review@example.com");
  assert.equal(
    rewritePageUrl("/about#team", BASE, "navigation"),
    "https://example.com/about#team",
  );
});

test("rewrites srcset candidates and drops unsafe ones", () => {
  assert.equal(
    rewriteSrcset("/a.png 1x, /b.png 2x", BASE),
    "https://example.com/a.png 1x, https://example.com/b.png 2x",
  );
  assert.equal(rewriteSrcset("javascript:alert(1) 1x, /ok.png 2x", BASE), "https://example.com/ok.png 2x");
});
