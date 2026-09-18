import assert from "node:assert/strict";
import { test } from "node:test";

import { hashPassword, verifyPassword } from "./password.ts";

test("password hashes verify and reject the wrong secret", async () => {
  const stored = await hashPassword("correct horse battery");
  assert.equal(await verifyPassword("correct horse battery", stored), true);
  assert.equal(await verifyPassword("wrong password", stored), false);
});
