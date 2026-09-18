import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createError,
  ERROR_CODES,
  isAppError,
  toErrorResponseBody,
} from "./errors.ts";

test("createError omits details when they are not provided", () => {
  const error = createError(ERROR_CODES.INVALID_URL, "A URL is required.");

  assert.deepEqual(error, {
    code: ERROR_CODES.INVALID_URL,
    message: "A URL is required.",
  });
  assert.equal("details" in error, false);
});

test("createError preserves details for structured clients", () => {
  const error = createError(ERROR_CODES.VALIDATION_ERROR, "Invalid field.", {
    field: "name",
  });

  assert.equal(error.details?.field, "name");
});

test("isAppError accepts known codes and rejects unknown payloads", () => {
  assert.equal(
    isAppError(createError(ERROR_CODES.SSRF_BLOCKED, "Blocked.")),
    true,
  );
  assert.equal(isAppError({ code: "LOL", message: "nope" }), false);
  assert.equal(isAppError(null), false);
});

test("toErrorResponseBody wraps errors for HTTP JSON", () => {
  const error = createError(ERROR_CODES.NOT_IMPLEMENTED, "Not yet.");
  assert.deepEqual(toErrorResponseBody(error), { error });
});
