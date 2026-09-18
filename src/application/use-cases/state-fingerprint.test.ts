import assert from "node:assert/strict";
import { test } from "node:test";

import { stateContentFingerprint } from "./state-fingerprint.ts";

test("fingerprints ignore item order and detect equivalent states", () => {
  const first = stateContentFingerprint([
    { selector: "h1", text: "Hello" },
    { selector: "p", text: "Slide 1" },
  ]);
  const shuffled = stateContentFingerprint([
    { selector: "p", text: "Slide 1" },
    { selector: "h1", text: "Hello" },
  ]);
  const other = stateContentFingerprint([
    { selector: "h1", text: "Hello" },
    { selector: "p", text: "Slide 2" },
  ]);

  assert.equal(first, shuffled);
  assert.notEqual(first, other);
});
