import { rewritePageUrl } from "./urls.ts";

const DANGEROUS_CSS =
  /expression\s*\(|-moz-binding|behavior\s*:|@charset|javascript\s*:|vbscript\s*:|data\s*:\s*text\s*\/|data\s*:\s*application\s*\//i;

export function sanitizeCss(css: string, baseUrl: string): string {
  const withoutImports = css.replace(/@import\b[^;]*;?/gi, "");
  return dropDangerousDeclarations(rewriteCssUrls(withoutImports, baseUrl));
}

function dropDangerousDeclarations(css: string): string {
  return css
    .split("}")
    .map((block) => {
      const separator = block.lastIndexOf("{");
      if (separator === -1) {
        return DANGEROUS_CSS.test(unescapeCss(block)) ? "" : block;
      }

      const prelude = block.slice(0, separator + 1);
      const body = block
        .slice(separator + 1)
        .split(";")
        .filter((declaration) => !DANGEROUS_CSS.test(unescapeCss(declaration)))
        .join(";");

      return `${prelude}${body}`;
    })
    .join("}");
}

function rewriteCssUrls(css: string, baseUrl: string): string {
  let result = "";
  let index = 0;
  const lower = css.toLowerCase();

  while (index < css.length) {
    const start = lower.indexOf("url(", index);
    if (start === -1) {
      result += css.slice(index);
      break;
    }

    result += css.slice(index, start);
    const parsed = readCssUrlFunction(css, start);
    if (parsed === undefined) {
      result += css.slice(start, start + 4);
      index = start + 4;
      continue;
    }

    const decoded = unescapeCss(parsed.value).trim();
    if (DANGEROUS_CSS.test(decoded)) {
      result += 'url("about:invalid")';
      index = parsed.end;
      continue;
    }

    const rewritten = rewritePageUrl(decoded, baseUrl, "resource");
    result += rewritten === undefined ? 'url("about:invalid")' : `url("${rewritten}")`;
    index = parsed.end;
  }

  return result;
}

function readCssUrlFunction(
  css: string,
  start: number,
): { value: string; end: number } | undefined {
  let index = start + 4;
  while (index < css.length && isCssWhitespace(css[index])) {
    index += 1;
  }

  const quote = css[index];
  if (quote === '"' || quote === "'") {
    index += 1;
    let value = "";
    while (index < css.length && css[index] !== quote) {
      if (css[index] === "\\") {
        value += css.slice(index, index + 2);
        index += 2;
        continue;
      }

      value += css[index];
      index += 1;
    }

    if (css[index] !== quote) {
      return undefined;
    }

    index += 1;
    while (index < css.length && isCssWhitespace(css[index])) {
      index += 1;
    }

    if (css[index] !== ")") {
      return undefined;
    }

    return { value, end: index + 1 };
  }

  let value = "";
  let depth = 1;
  while (index < css.length && depth > 0) {
    const character = css[index];
    if (character === undefined) {
      break;
    }

    if (character === "\\") {
      value += css.slice(index, index + 2);
      index += 2;
      continue;
    }

    if (character === "(") {
      depth += 1;
      value += character;
      index += 1;
      continue;
    }

    if (character === ")") {
      depth -= 1;
      if (depth === 0) {
        index += 1;
        break;
      }

      value += character;
      index += 1;
      continue;
    }

    value += character;
    index += 1;
  }

  return { value: value.trim(), end: index };
}

export function unescapeCss(value: string): string {
  return value.replace(
    /\\([0-9a-fA-F]{1,6})\s?|\\(.)/g,
    (_match, hex: string | undefined, character: string | undefined) => {
      if (hex !== undefined) {
        return String.fromCodePoint(Number.parseInt(hex, 16));
      }

      return character ?? "";
    },
  );
}

function isCssWhitespace(character: string | undefined): boolean {
  return character === " " || character === "\t" || character === "\n" || character === "\r" || character === "\f";
}
