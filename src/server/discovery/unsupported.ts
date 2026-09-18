import type { UnsupportedDynamicSignal } from "../../application/ports/discovery.ts";

export function detectUnsupportedDynamic(html: string): UnsupportedDynamicSignal[] {
  const signals: UnsupportedDynamicSignal[] = [];

  if (/<input\b[^>]*type=["']password["']/i.test(html)) {
    signals.push({
      kind: "authentication",
      message: "Sign-in or password fields are not completed during discovery.",
    });
  }

  if (/\bnew\s+WebSocket\s*\(|\bwss?:\/\//i.test(html)) {
    signals.push({
      kind: "websocket",
      message: "Realtime WebSocket updates are not cloned into the review snapshot.",
    });
  }

  if (
    /autocomplete=["']cc-number["']/i.test(html) ||
    /js\.stripe\.com/i.test(html) ||
    /paypal\.com\/sdk/i.test(html)
  ) {
    signals.push({
      kind: "payment",
      message: "Payment widgets are not cloned for review.",
    });
  }

  return signals;
}

export function isAuthenticationOnlyPage(
  html: string,
  extractableCount: number,
  unsupported: readonly UnsupportedDynamicSignal[],
): boolean {
  return (
    extractableCount === 0 &&
    unsupported.some((signal) => signal.kind === "authentication") &&
    /<form[\s>]/i.test(html)
  );
}
