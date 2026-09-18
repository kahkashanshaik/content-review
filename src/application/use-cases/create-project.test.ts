import assert from "node:assert/strict";
import { test } from "node:test";

import { createProject } from "./create-project.ts";

const USER_ID = "user_11111111-1111-4111-8111-111111111111";

test("createProject trims the name and freezes the website origin", () => {
  const result = createProject(
    { name: "  Launch site  ", userId: USER_ID, originUrl: "https://youroffer.now.com/en/home/" },
    () => "2026-09-09T00:00:00.000Z",
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.name, "Launch site");
  assert.match(result.value.id, /^project_/);
  assert.equal(result.value.userId, USER_ID);
  assert.equal(result.value.originUrl, "https://youroffer.now.com");
  assert.equal(result.value.allowedHost, "youroffer.now.com");
  assert.equal(result.value.createdAt, "2026-09-09T00:00:00.000Z");
});

test("createProject rejects a blank name", () => {
  const result = createProject({ name: "   ", userId: USER_ID, originUrl: "https://example.com" });

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.equal(result.error.code, "VALIDATION_ERROR");
  assert.equal(result.error.details?.field, "name");
});

test("createProject rejects a non-http origin", () => {
  const result = createProject({ name: "Launch", userId: USER_ID, originUrl: "ftp://example.com" });
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.equal(result.error.code, "INVALID_URL");
});
