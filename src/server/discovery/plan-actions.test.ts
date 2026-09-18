import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_DISCOVERY_LIMITS } from "./limits.ts";
import { DYNAMIC_FIXTURE_HTML } from "./dynamic-fixture.ts";
import { planDiscoveryActions } from "./plan-actions.ts";

test("plans carousel, tab, accordion, modal, dropdown, and show-hide actions", () => {
  const steps = planDiscoveryActions(DYNAMIC_FIXTURE_HTML, DEFAULT_DISCOVERY_LIMITS);
  const captures = steps.flatMap((step) => (step.kind === "click" && step.capture ? [step.capture] : []));
  const keys = captures.map((capture) => capture.key);

  assert.equal(keys.includes("carousel:slide-2"), true);
  assert.equal(keys.includes("carousel:slide-3"), true);
  assert.equal(keys.includes("tab:pricing"), true);
  assert.equal(keys.includes("accordion:shipping"), true);
  assert.equal(keys.includes("accordion:returns"), true);
  assert.equal(keys.includes("modal:open-hours"), true);
  assert.equal(keys.includes("dropdown:account-menu"), true);
  assert.equal(keys.includes("show-hide:show-extra"), true);
  assert.equal(steps.some((step) => step.kind === "escape"), true);
});

test("plans actions for Swiper carousels without ARIA roles", () => {
  const html = `<html><body>
    <div class="swiper">
      <div class="swiper-wrapper">
        <div class="swiper-slide">One</div>
        <div class="swiper-slide">Two</div>
        <div class="swiper-slide">Three</div>
      </div>
      <div class="swiper-button-next" id="swiper-next"></div>
      <div class="swiper-button-prev" id="swiper-prev"></div>
    </div>
  </body></html>`;
  const steps = planDiscoveryActions(html, DEFAULT_DISCOVERY_LIMITS);
  const keys = steps.flatMap((step) => (step.kind === "click" && step.capture ? [step.capture.key] : []));
  assert.equal(keys.includes("carousel:slide-2"), true);
  assert.equal(keys.includes("carousel:slide-3"), true);
  assert.equal(steps.some((step) => step.kind === "click" && step.selector === "#swiper-next"), true);
});
