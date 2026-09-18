import assert from "node:assert/strict";
import { test } from "node:test";

import { detectUnsupportedDynamic, isAuthenticationOnlyPage } from "./unsupported.ts";

test("detects websocket, authentication, and payment signals", () => {
  const html = `
    <html><body>
      <form><input type="password" name="p" /></form>
      <script>const socket = new WebSocket("wss://example.com/live");</script>
      <script src="https://js.stripe.com/v3"></script>
    </body></html>
  `;
  const signals = detectUnsupportedDynamic(html);
  assert.equal(signals.some((signal) => signal.kind === "authentication"), true);
  assert.equal(signals.some((signal) => signal.kind === "websocket"), true);
  assert.equal(signals.some((signal) => signal.kind === "payment"), true);
  assert.equal(isAuthenticationOnlyPage(html, 0, signals), true);
});
