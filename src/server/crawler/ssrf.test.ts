import assert from "node:assert/strict";
import { test } from "node:test";

import { hostnameAsIp, inspectIp, isBlockedHostname, isBlockedIp } from "./ssrf.ts";

const BLOCKED_IPS = [
  ["127.0.0.1", "loopback"],
  ["127.1.2.3", "loopback"],
  ["::1", "loopback"],
  ["0.0.0.0", "unspecified"],
  ["10.0.0.8", "private"],
  ["10.255.255.255", "private"],
  ["192.168.1.1", "private"],
  ["172.16.0.1", "private"],
  ["172.31.255.255", "private"],
  ["169.254.1.1", "link-local"],
  ["169.254.169.254", "metadata"],
  ["169.254.170.2", "metadata"],
  ["100.64.0.1", "cgnat"],
  ["100.100.100.200", "metadata"],
  ["::ffff:127.0.0.1", "loopback"],
  ["::ffff:169.254.169.254", "metadata"],
  ["::ffff:10.0.0.1", "private"],
  ["fe80::1", "link-local"],
  ["fc00::1", "unique-local"],
  ["fd00::1", "unique-local"],
  ["fd00:ec2::254", "metadata"],
  ["ff02::1", "multicast"],
] as const;

test("inspectIp blocks loopback, private, link-local, ULA, CGNAT, and metadata addresses", () => {
  for (const [ip, reason] of BLOCKED_IPS) {
    const inspection = inspectIp(ip);
    assert.equal(inspection.blocked, true, `${ip} should be blocked`);
    if (inspection.blocked) {
      assert.equal(inspection.reason, reason, `${ip} reason`);
    }
  }
});

test("inspectIp allows public unicast addresses", () => {
  assert.equal(inspectIp("8.8.8.8").blocked, false);
  assert.equal(inspectIp("1.1.1.1").blocked, false);
  assert.equal(inspectIp("172.32.0.1").blocked, false);
  assert.equal(inspectIp("2001:4860:4860::8888").blocked, false);
});

test("hostnameAsIp decodes decimal IPv4 and mapped IPv6", () => {
  assert.equal(hostnameAsIp("2130706433"), "127.0.0.1");
  assert.equal(hostnameAsIp("127.0.0.1"), "127.0.0.1");
  assert.equal(hostnameAsIp("::ffff:127.0.0.1"), "127.0.0.1");
});

test("isBlockedHostname covers localhost and metadata names", () => {
  assert.equal(isBlockedHostname("localhost"), true);
  assert.equal(isBlockedHostname("LOCALHOST."), true);
  assert.equal(isBlockedHostname("app.localhost"), true);
  assert.equal(isBlockedHostname("printer.local"), true);
  assert.equal(isBlockedHostname("metadata.google.internal"), true);
  assert.equal(isBlockedHostname("instance-data"), true);
  assert.equal(isBlockedHostname("example.com"), false);
});

test("isBlockedIp matches inspectIp", () => {
  assert.equal(isBlockedIp("127.0.0.1"), true);
  assert.equal(isBlockedIp("8.8.8.8"), false);
});
