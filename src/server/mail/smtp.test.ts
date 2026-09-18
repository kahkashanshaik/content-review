import assert from "node:assert/strict";
import { test } from "node:test";

import { authLoginToken, authPlainToken, buildSmtpData, smtpSettingsFromEnv } from "./smtp.ts";

test("smtpSettingsFromEnv reads Gmail settings and strips app-password spaces", () => {
  const settings = smtpSettingsFromEnv({
    SMTP_HOST: "smtp.gmail.com",
    SMTP_PORT: "587",
    SMTP_USER: "reviewer@example.com",
    SMTP_PASS: "aaaa bbbb cccc dddd",
    MAIL_FROM: "reviewer@example.com",
  });

  assert.deepEqual(settings, {
    host: "smtp.gmail.com",
    port: 587,
    user: "reviewer@example.com",
    password: "aaaabbbbccccdddd",
    from: "reviewer@example.com",
  });
});

test("smtpSettingsFromEnv is absent without a password", () => {
  assert.equal(
    smtpSettingsFromEnv({
      SMTP_HOST: "smtp.gmail.com",
      SMTP_USER: "reviewer@example.com",
    }),
    undefined,
  );
});

test("buildSmtpData dots-stuffs and keeps a plain subject", () => {
  const data = buildSmtpData("from@example.com", {
    to: "to@example.com",
    subject: "You're invited",
    text: "Hello\n.hidden",
  });

  assert.match(data, /^From: from@example.com\r\n/);
  assert.match(data, /\r\nTo: to@example.com\r\n/);
  assert.match(data, /\r\nSubject: You're invited\r\n/);
  assert.match(data, /\r\n\r\nHello\r\n\.\.hidden\r\n\.$/);
});

test("authPlainToken is a base64 null-delimited login", () => {
  const decoded = Buffer.from(authPlainToken("user@example.com", "secret"), "base64").toString("utf8");
  assert.equal(decoded, "\u0000user@example.com\u0000secret");
});

test("authLoginToken is base64 of the raw value", () => {
  assert.equal(authLoginToken("user@example.com"), Buffer.from("user@example.com", "utf8").toString("base64"));
});
