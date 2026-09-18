import assert from "node:assert/strict";
import { test } from "node:test";

import { authorizeDiscoveryRequest } from "./request-guard.ts";

test("discovery request guard blocks localhost and private addresses", async () => {
  const lookup = async () => [{ address: "127.0.0.1", family: 4 as const }];
  const loopback = await authorizeDiscoveryRequest("http://127.0.0.1/", lookup);
  const metadata = await authorizeDiscoveryRequest("http://169.254.169.254/", lookup);
  const fileUrl = await authorizeDiscoveryRequest("file:///etc/passwd", lookup);
  const blank = await authorizeDiscoveryRequest("about:blank", lookup);

  assert.equal(loopback.ok, false);
  if (!loopback.ok) {
    assert.equal(loopback.error.code, "SSRF_BLOCKED");
  }
  assert.equal(metadata.ok, false);
  assert.equal(fileUrl.ok, false);
  assert.equal(blank.ok, true);
});
