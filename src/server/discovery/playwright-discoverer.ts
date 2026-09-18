import { chromium, type Browser, type Page } from "playwright-core";

import type {
  DynamicDiscoverer,
  DynamicDiscoveryRequest,
  DynamicDiscoveryResult,
  DiscoveredStateCapture,
} from "../../application/ports/discovery.ts";
import { createError, ERROR_CODES, type Result } from "../../domain/errors.ts";
import { nodeLookup, type LookupFn } from "../crawler/dns.ts";
import { resolveChromiumExecutable } from "./chromium.ts";
import { DEFAULT_DISCOVERY_LIMITS, type DiscoveryLimits } from "./limits.ts";
import { planDiscoveryActions } from "./plan-actions.ts";
import { authorizeDiscoveryRequest, browserUnavailable } from "./request-guard.ts";
import { detectUnsupportedDynamic } from "./unsupported.ts";

export type PlaywrightDiscovererOptions = {
  lookup?: LookupFn;
  limits?: DiscoveryLimits;
  executablePath?: string;
};

export function createPlaywrightDiscoverer(
  options: PlaywrightDiscovererOptions = {},
): DynamicDiscoverer {
  return {
    discover(request) {
      return discoverWithPlaywright(request, options);
    },
  };
}

async function discoverWithPlaywright(
  request: DynamicDiscoveryRequest,
  options: PlaywrightDiscovererOptions,
): Promise<Result<DynamicDiscoveryResult>> {
  const limits = options.limits ?? DEFAULT_DISCOVERY_LIMITS;
  const lookup = options.lookup ?? nodeLookup;
  const started = Date.now();

  if (request.source === "url") {
    const authorized = await authorizeDiscoveryRequest(request.url, lookup);
    if (!authorized.ok) {
      return authorized;
    }
  }

  let browser: Browser | undefined;
  try {
    browser = await launchBrowser(options.executablePath);
    const context = await browser.newContext({
      acceptDownloads: false,
      javaScriptEnabled: true,
      extraHTTPHeaders: {},
      viewport: { width: 1280, height: 900 },
    });
    await context.clearCookies();
    await context.route("**/*", async (route) => {
      const allowed = await authorizeDiscoveryRequest(route.request().url(), lookup);
      if (!allowed.ok) {
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });

    const page = await context.newPage();
    page.setDefaultTimeout(limits.actionTimeoutMs);
    page.setDefaultNavigationTimeout(limits.navigationTimeoutMs);

    if (request.source === "url") {
      await page.goto(request.url, {
        waitUntil: "domcontentloaded",
        timeout: limits.navigationTimeoutMs,
      });
    } else {
      await page.setContent(request.html, {
        waitUntil: "domcontentloaded",
        timeout: limits.navigationTimeoutMs,
      });
    }

    await waitForPageToSettle(page, limits, request.source === "url");
    const initialHtml = await page.content();
    const captures: DiscoveredStateCapture[] = [
      {
        type: "default",
        key: "default",
        label: "Default",
        html: initialHtml,
      },
    ];
    const unsupported = detectUnsupportedDynamic(initialHtml);
    const steps = planDiscoveryActions(initialHtml, limits);
    let actions = 0;

    for (const step of steps) {
      if (Date.now() - started > limits.totalTimeoutMs) {
        break;
      }
      if (captures.length >= limits.maxStates || actions >= limits.maxActions) {
        break;
      }

      try {
        if (step.kind === "escape") {
          await page.keyboard.press("Escape");
        } else {
          await page.click(step.selector, { timeout: limits.actionTimeoutMs });
        }
        actions += 1;
        await page.waitForTimeout(limits.settleMs);
      } catch {
        continue;
      }

      if (step.kind === "click" && step.capture !== undefined) {
        captures.push({
          type: step.capture.type,
          key: step.capture.key,
          label: step.capture.label,
          html: await page.content(),
        });
      }
    }

    return {
      ok: true,
      value: {
        finalUrl: request.source === "url" ? page.url() : request.baseUrl,
        captures,
        unsupported,
      },
    };
  } catch (caught) {
    if (isBrowserUnavailable(caught)) {
      return browserUnavailable("A discovery browser could not be started.");
    }

    return {
      ok: false,
      error: createError(
        ERROR_CODES.FETCH_FAILED,
        caught instanceof Error ? caught.message : "Dynamic discovery failed.",
      ),
    };
  } finally {
    if (browser !== undefined) {
      await browser.close();
    }
  }
}

async function launchBrowser(executablePath: string | undefined): Promise<Browser> {
  const resolved = executablePath ?? resolveChromiumExecutable();
  try {
    return await chromium.launch({
      headless: true,
      args: ["--disable-gpu", "--disable-dev-shm-usage"],
      ...(resolved === undefined ? {} : { executablePath: resolved }),
    });
  } catch {
    if (resolved !== undefined) {
      return chromium.launch({
        headless: true,
        executablePath: resolved,
        args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
      });
    }
    throw new Error("browser-unavailable");
  }
}

async function waitForPageToSettle(
  page: Page,
  limits: DiscoveryLimits,
  waitForNetwork: boolean,
): Promise<void> {
  if (waitForNetwork) {
    await page
      .waitForLoadState("networkidle", { timeout: Math.min(8_000, limits.navigationTimeoutMs) })
      .catch(() => undefined);
  }

  await page
    .waitForFunction(
      () => {
        const sliders = document.querySelectorAll(
          ".swiper, .swiper-container, .slick-slider, .owl-carousel, .splide, .e-n-carousel",
        );
        if (sliders.length === 0) {
          return document.readyState === "complete";
        }

        return Array.from(sliders).some(
          (slider) =>
            slider.classList.contains("swiper-initialized") ||
            slider.classList.contains("slick-initialized") ||
            slider.classList.contains("owl-loaded") ||
            slider.classList.contains("is-initialized") ||
            slider.querySelector(".swiper-slide, .slick-slide, .owl-item, .splide__slide") !== null,
        );
      },
      { timeout: Math.min(6_000, limits.navigationTimeoutMs) },
    )
    .catch(() => undefined);
  await page.waitForTimeout(limits.settleMs);
}

function isBrowserUnavailable(caught: unknown): boolean {
  if (caught instanceof Error && caught.message.includes("browser-unavailable")) {
    return true;
  }
  if (caught instanceof Error && /executable doesn't exist|browserType\.launch/i.test(caught.message)) {
    return true;
  }
  return false;
}
