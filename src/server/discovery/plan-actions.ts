import { parseHTML } from "linkedom";

import type { PageStateType } from "../../domain/types.ts";
import { elementSelector } from "../extraction/selector.ts";
import type { HtmlElement } from "../extraction/dom.ts";
import type { DiscoveryLimits } from "./limits.ts";

export type DiscoveryCaptureMeta = {
  type: Exclude<PageStateType, "default">;
  key: string;
  label: string;
};

export type DiscoveryStep =
  | {
      kind: "click";
      selector: string;
      capture?: DiscoveryCaptureMeta;
    }
  | {
      kind: "escape";
    };

export function planDiscoveryActions(html: string, limits: DiscoveryLimits): DiscoveryStep[] {
  const { document } = parseHTML(html);
  const root = document.body ?? document.documentElement;
  if (root === null) {
    return [];
  }

  const steps: DiscoveryStep[] = [];
  planCarousel(root as HtmlElement, limits, steps);
  planTabs(root as HtmlElement, limits, steps);
  planAccordions(root as HtmlElement, steps);
  planModals(root as HtmlElement, steps);
  planDropdowns(root as HtmlElement, steps);
  planShowHide(root as HtmlElement, steps);
  return steps;
}

function planCarousel(
  root: HtmlElement,
  limits: DiscoveryLimits,
  steps: DiscoveryStep[],
): void {
  const carousels = queryAll(
    root,
    '[aria-roledescription="carousel"], [data-carousel], .swiper, .swiper-container, .slick-slider, .owl-carousel, .splide, .e-n-carousel',
  );
  for (const carousel of carousels) {
    const next = query(
      carousel,
      "[data-carousel-next], button[aria-label='Next slide'], .swiper-button-next, .slick-next, .owl-next, .splide__arrow--next",
    );
    const prev = query(
      carousel,
      "[data-carousel-prev], button[aria-label='Previous slide'], .swiper-button-prev, .slick-prev, .owl-prev, .splide__arrow--prev",
    );
    const slides = queryAll(
      carousel,
      '[aria-roledescription="slide"], [data-slide], .swiper-slide:not(.swiper-slide-duplicate), .slick-slide:not(.slick-cloned), .owl-item:not(.cloned), .splide__slide:not(.is-clone)',
    );
    if (next === null || slides.length < 2) {
      continue;
    }

    const slideCount = Math.min(slides.length, limits.maxCarouselSlides);
    const nextSelector = usableSelector(next);
    for (let index = 2; index <= slideCount; index += 1) {
      steps.push({
        kind: "click",
        selector: nextSelector,
        capture: {
          type: "carousel",
          key: `carousel:slide-${index}`,
          label: `Slide ${index}`,
        },
      });
    }

    if (prev !== null) {
      const prevSelector = usableSelector(prev);
      for (let index = 2; index <= slideCount; index += 1) {
        steps.push({ kind: "click", selector: prevSelector });
      }
    }
  }
}

function planTabs(root: HtmlElement, limits: DiscoveryLimits, steps: DiscoveryStep[]): void {
  const tabs = queryAll(root, '[role="tab"]');
  const unselected = tabs.filter((tab) => tab.getAttribute("aria-selected") !== "true");
  const selected = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
  let planned = 0;

  for (const tab of unselected) {
    if (planned >= limits.maxTabs) {
      break;
    }
    steps.push({
      kind: "click",
      selector: usableSelector(tab),
      capture: {
        type: "tab",
        key: `tab:${slug(labelOf(tab))}`,
        label: labelOf(tab),
      },
    });
    planned += 1;
  }

  if (selected !== undefined && planned > 0) {
    steps.push({ kind: "click", selector: usableSelector(selected) });
  }
}

function planAccordions(root: HtmlElement, steps: DiscoveryStep[]): void {
  const buttons = queryAll(root, "button[aria-expanded][aria-controls]");
  for (const button of buttons) {
    if (button.getAttribute("data-show-hide") !== null) {
      continue;
    }
    if (button.getAttribute("aria-haspopup") !== null) {
      continue;
    }
    if (button.getAttribute("role") === "tab") {
      continue;
    }

    const label = labelOf(button);
    const selector = usableSelector(button);
    steps.push({
      kind: "click",
      selector,
      capture: {
        type: "accordion",
        key: `accordion:${slug(label)}`,
        label,
      },
    });
    steps.push({ kind: "click", selector });
  }
}

function planModals(root: HtmlElement, steps: DiscoveryStep[]): void {
  const openers = queryAll(
    root,
    '[aria-haspopup="dialog"], [data-open-modal], button[aria-controls][aria-haspopup="dialog"]',
  );
  for (const opener of openers) {
    steps.push({
      kind: "click",
      selector: usableSelector(opener),
      capture: {
        type: "modal",
        key: `modal:${slug(labelOf(opener))}`,
        label: labelOf(opener),
      },
    });
    const dialogId = opener.getAttribute("aria-controls");
    const closer =
      (dialogId !== null ? query(root, `#${cssIdent(dialogId)} [data-close-modal], #${cssIdent(dialogId)} button`) : null) ??
      query(root, "[data-close-modal]");
    if (closer !== null) {
      steps.push({ kind: "click", selector: usableSelector(closer) });
    } else {
      steps.push({ kind: "escape" });
    }
  }
}

function planDropdowns(root: HtmlElement, steps: DiscoveryStep[]): void {
  const triggers = queryAll(root, '[aria-haspopup="menu"], [aria-haspopup="listbox"], [data-dropdown]');
  for (const trigger of triggers) {
    if (trigger.getAttribute("aria-haspopup") === "dialog") {
      continue;
    }
    const selector = usableSelector(trigger);
    steps.push({
      kind: "click",
      selector,
      capture: {
        type: "dropdown",
        key: `dropdown:${slug(labelOf(trigger))}`,
        label: labelOf(trigger),
      },
    });
    steps.push({ kind: "escape" });
  }
}

function planShowHide(root: HtmlElement, steps: DiscoveryStep[]): void {
  const toggles = queryAll(root, "[data-show-hide]");
  for (const toggle of toggles) {
    const selector = usableSelector(toggle);
    steps.push({
      kind: "click",
      selector,
      capture: {
        type: "show-hide",
        key: `show-hide:${slug(labelOf(toggle))}`,
        label: labelOf(toggle),
      },
    });
    steps.push({ kind: "click", selector });
  }
}

function query(root: HtmlElement, selector: string): HtmlElement | null {
  const node = (root as unknown as { querySelector(sel: string): HtmlElement | null }).querySelector(
    selector,
  );
  return node;
}

function queryAll(root: HtmlElement, selector: string): HtmlElement[] {
  const list = (
    root as unknown as { querySelectorAll(sel: string): ArrayLike<HtmlElement> }
  ).querySelectorAll(selector);
  return Array.from(list);
}

function usableSelector(element: HtmlElement): string {
  const id = element.getAttribute("id")?.trim();
  if (id !== undefined && /^[A-Za-z][\w-]*$/.test(id)) {
    return `#${id}`;
  }

  return elementSelector(element);
}

function labelOf(element: HtmlElement): string {
  const labelled = element.getAttribute("aria-label")?.trim();
  if (labelled) {
    return labelled;
  }

  return (element.textContent ?? "").replace(/\s+/g, " ").trim() || "State";
}

function slug(value: string): string {
  const slugified = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slugified.length > 0 ? slugified : "item";
}

function cssIdent(value: string): string {
  return /^[A-Za-z][\w-]*$/.test(value) ? value : "";
}
