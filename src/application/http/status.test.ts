import assert from "node:assert/strict";
import { test } from "node:test";

import { createError, ERROR_CODES } from "../../domain/errors.ts";
import { httpStatusForError } from "./status.ts";

test("httpStatusForError maps foundation and crawl codes to HTTP statuses", () => {
  assert.equal(
    httpStatusForError(createError(ERROR_CODES.NOT_IMPLEMENTED, "later")),
    501,
  );
  assert.equal(
    httpStatusForError(createError(ERROR_CODES.SSRF_BLOCKED, "blocked")),
    403,
  );
  assert.equal(
    httpStatusForError(createError(ERROR_CODES.INVALID_URL, "bad url")),
    400,
  );
  assert.equal(
    httpStatusForError(createError(ERROR_CODES.REQUEST_TIMEOUT, "timeout")),
    504,
  );
  assert.equal(
    httpStatusForError(createError(ERROR_CODES.FETCH_FAILED, "down")),
    502,
  );
});
