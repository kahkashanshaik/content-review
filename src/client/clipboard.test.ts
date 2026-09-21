import assert from "node:assert/strict";
import { test } from "node:test";

import { copyText, type CopyDocument, type CopyField } from "./clipboard.ts";

test("copyText uses the clipboard API when it is available", async () => {
  const written: string[] = [];
  await copyText("https://example.com/review", {
    clipboard: {
      async writeText(value) {
        written.push(value);
      },
    },
  });
  assert.deepEqual(written, ["https://example.com/review"]);
});

test("copyText falls back to execCommand when clipboard is missing", async () => {
  const document = createCopyDocument(true);
  await copyText("https://example.com/review", { document });
  assert.equal(document.copied, "https://example.com/review");
  assert.equal(document.removed, true);
});

test("copyText falls back after clipboard.writeText rejects", async () => {
  const document = createCopyDocument(true);
  await copyText("https://example.com/review", {
    clipboard: {
      async writeText() {
        throw new Error("NotAllowedError");
      },
    },
    document,
  });
  assert.equal(document.copied, "https://example.com/review");
});

test("copyText throws when neither clipboard nor execCommand can copy", async () => {
  await assert.rejects(
    () => copyText("https://example.com/review", {}),
    /could not be copied/i,
  );
});

function createCopyDocument(succeeds: boolean): CopyDocument & { copied?: string; removed: boolean } {
  const state: CopyDocument & { copied?: string; removed: boolean } = {
    removed: false,
    createElement() {
      const field: CopyField = {
        value: "",
        setAttribute() {},
        style: {
          position: "",
          insetInlineStart: "",
          top: "",
          opacity: "",
        },
        focus() {},
        select() {},
        remove() {
          state.removed = true;
        },
      };
      return field;
    },
    body: {
      appendChild(node) {
        state.copied = node.value;
      },
    },
    execCommand() {
      return succeeds;
    },
  };
  return state;
}
