import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

import { buildCrawlerHeaders, nodeHttpGet } from "./http-get.ts";

test("buildCrawlerHeaders does not send cookies or credentials", () => {
  const headers = buildCrawlerHeaders(new URL("https://example.com/path"));

  assert.equal(headers.Host, "example.com");
  assert.equal(headers.Cookie, undefined);
  assert.equal(headers.Authorization, undefined);
  assert.equal(headers["User-Agent"], "ContentReviewBot/0.1");
});

test("nodeHttpGet pins the connection IP and limits response size", async () => {
  const server = createServer((req, res) => {
    assert.equal(req.headers.host, `example.com:${(server.address() as AddressInfo).port}`);
    assert.equal(req.headers.cookie, undefined);
    assert.equal(req.headers.authorization, undefined);
    res.statusCode = 200;
    res.setHeader("content-type", "text/html");
    res.end("<h1>hello</h1>");
  });

  await listen(server);
  const { port } = server.address() as AddressInfo;

  try {
    const result = await nodeHttpGet({
      url: new URL(`http://example.com:${port}/`),
      pinnedAddress: "127.0.0.1",
      family: 4,
      connectTimeoutMs: 1000,
      deadlineMs: Date.now() + 2000,
      maxResponseBytes: 1024,
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.value.status, 200);
    assert.equal(Buffer.from(result.value.body).toString("utf8"), "<h1>hello</h1>");
  } finally {
    server.close();
  }
});

test("nodeHttpGet rejects oversized Content-Length before reading the body", async () => {
  const server = createServer((_req, res) => {
    res.statusCode = 200;
    res.setHeader("content-type", "text/html");
    res.setHeader("content-length", "5000");
    res.end("x".repeat(5000));
  });

  await listen(server);
  const { port } = server.address() as AddressInfo;

  try {
    const result = await nodeHttpGet({
      url: new URL(`http://example.com:${port}/`),
      pinnedAddress: "127.0.0.1",
      family: 4,
      connectTimeoutMs: 1000,
      deadlineMs: Date.now() + 2000,
      maxResponseBytes: 16,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "RESPONSE_TOO_LARGE");
    }
  } finally {
    server.close();
  }
});

test("nodeHttpGet times out a stalled connection", async () => {
  const server = createServer(() => {
    // Intentionally never respond.
  });

  await listen(server);
  const { port } = server.address() as AddressInfo;

  try {
    const result = await nodeHttpGet({
      url: new URL(`http://example.com:${port}/`),
      pinnedAddress: "127.0.0.1",
      family: 4,
      connectTimeoutMs: 50,
      deadlineMs: Date.now() + 80,
      maxResponseBytes: 1024,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "REQUEST_TIMEOUT");
    }
  } finally {
    server.close();
  }
});

function listen(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
}
