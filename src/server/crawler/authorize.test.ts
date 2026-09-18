import assert from "node:assert/strict";
import { test } from "node:test";

import { authorizeUrl } from "./authorize.ts";
import type { LookupFn } from "./dns.ts";

const publicLookup: LookupFn = async () => [{ address: "93.184.216.34", family: 4 }];

test("authorizeUrl blocks localhost and loopback literals before DNS", async () => {
  for (const url of [
    "http://127.0.0.1/",
    "https://localhost/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://2130706433/",
  ]) {
    const result = await authorizeUrl(url, async () => {
      throw new Error("DNS must not run for blocked literals");
    });
    assert.equal(result.ok, false, url);
    if (!result.ok) {
      assert.equal(result.error.code, "SSRF_BLOCKED");
    }
  }
});

test("authorizeUrl blocks private, link-local, and metadata literals", async () => {
  for (const url of [
    "http://192.168.0.5/",
    "http://10.1.1.1/",
    "http://172.16.4.4/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[fd00:ec2::254]/",
    "http://[fe80::1]/",
  ]) {
    const result = await authorizeUrl(url, publicLookup);
    assert.equal(result.ok, false, url);
    if (!result.ok) {
      assert.equal(result.error.code, "SSRF_BLOCKED");
    }
  }
});

test("authorizeUrl blocks metadata hostnames without resolving them", async () => {
  const result = await authorizeUrl(
    "http://metadata.google.internal/computeMetadata/v1/",
    async () => {
      throw new Error("DNS must not run for metadata hostnames");
    },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "SSRF_BLOCKED");
    assert.equal(result.error.details?.reason, "hostname");
  }
});

test("authorizeUrl blocks DNS records that resolve to a private or metadata address", async () => {
  const result = await authorizeUrl("https://evil.example/", async () => [
    { address: "169.254.169.254", family: 4 },
  ]);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "SSRF_BLOCKED");
  }
});

test("authorizeUrl blocks mixed public and private DNS records", async () => {
  const result = await authorizeUrl("https://dual.example/", async () => [
    { address: "93.184.216.34", family: 4 },
    { address: "10.0.0.1", family: 4 },
  ]);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "SSRF_BLOCKED");
  }
});

test("authorizeUrl pins a public resolved address", async () => {
  const result = await authorizeUrl("https://example.com/path", publicLookup);

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.pinnedAddress, "93.184.216.34");
  assert.equal(result.value.family, 4);
  assert.equal(result.value.url.hostname, "example.com");
});
