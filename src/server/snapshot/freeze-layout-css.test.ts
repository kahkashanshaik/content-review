import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FREEZE_DYNAMIC_LAYOUT_CSS,
  FREEZE_LAYOUT_ATTRIBUTE,
  injectFreezeLayoutIntoHtml,
} from "./freeze-layout-css.ts";

test("injectFreezeLayoutIntoHtml adds freeze CSS once inside head", () => {
  const html = "<html><head><title>Home</title></head><body><div class=\"swiper-wrapper\"></div></body></html>";
  const first = injectFreezeLayoutIntoHtml(html);

  assert.match(first, new RegExp(`<style ${FREEZE_LAYOUT_ATTRIBUTE}="true">`));
  assert.match(first, /swiper-wrapper/);
  assert.match(first, /transform:\s*none\s*!important/);
  assert.match(first, /:has\(\.swiper\)/);
  assert.equal(injectFreezeLayoutIntoHtml(first), first);
  assert.match(FREEZE_DYNAMIC_LAYOUT_CSS, /elementor-invisible/);
});
