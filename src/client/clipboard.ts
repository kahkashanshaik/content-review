export type ClipboardWriter = {
  writeText(value: string): Promise<void>;
};

export type CopyDocument = {
  createElement(tag: "textarea"): CopyField;
  body: {
    appendChild(node: CopyField): void;
  };
  execCommand(command: string): boolean;
};

export type CopyField = {
  value: string;
  setAttribute(name: string, value: string): void;
  style: {
    position: string;
    insetInlineStart: string;
    top: string;
    opacity: string;
  };
  focus(): void;
  select(): void;
  remove(): void;
};

export type CopyTextEnv = {
  clipboard?: ClipboardWriter;
  document?: CopyDocument;
};

export async function copyText(
  value: string,
  env: CopyTextEnv = defaultCopyEnv(),
): Promise<void> {
  if (env.clipboard !== undefined) {
    try {
      await env.clipboard.writeText(value);
      return;
    } catch {
      // HTTP pages and some browsers expose clipboard but reject writeText.
    }
  }

  copyWithExecCommand(value, env.document);
}

function copyWithExecCommand(value: string, document: CopyDocument | undefined): void {
  if (document === undefined) {
    throw new Error("The review link could not be copied.");
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.insetInlineStart = "0";
  field.style.top = "0";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.focus();
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) {
    throw new Error("The review link could not be copied.");
  }
}

function defaultCopyEnv(): CopyTextEnv {
  const clipboard = globalThis.navigator?.clipboard;
  return {
    ...(clipboard !== undefined && typeof clipboard.writeText === "function" ? { clipboard } : {}),
    ...(globalThis.document === undefined ? {} : { document: globalThis.document as CopyDocument }),
  };
}
