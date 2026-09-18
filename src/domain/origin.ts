import { createError, ERROR_CODES, type Result } from "./errors.ts";

export type ProjectOrigin = {
  originUrl: string;
  allowedHost: string;
};

export function parseWebsiteUrl(input: string): Result<URL> {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_URL, "A website URL is required.", { field: "originUrl" }),
    };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_URL, "The website URL could not be parsed.", {
        field: "originUrl",
      }),
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_URL, "Only HTTP and HTTPS URLs are supported.", {
        field: "originUrl",
        scheme: url.protocol.replace(":", ""),
      }),
    };
  }

  if (url.username !== "" || url.password !== "") {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_URL, "URLs must not include credentials.", {
        field: "originUrl",
      }),
    };
  }

  if (url.hostname.trim() === "") {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_URL, "The URL is missing a hostname.", {
        field: "originUrl",
      }),
    };
  }

  url.hash = "";
  return { ok: true, value: url };
}

export function projectOriginFromUrl(url: URL): ProjectOrigin {
  return {
    originUrl: `${url.protocol}//${url.host}`,
    allowedHost: url.hostname.toLowerCase(),
  };
}

export function normalizePageUrl(url: URL): string {
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  return `${url.protocol}//${url.host}${pathname}${url.search}`;
}

export function coercePagePathDraft(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("//")) {
    return value;
  }

  if (trimmed === "") {
    return "/";
  }

  return trimmed.startsWith("/") ? value.replace(/^\s+/, "") : `/${trimmed}`;
}

export function pagePathFromUrl(url: URL): string {
  let pathname = url.pathname;
  if (pathname.length === 0) {
    pathname = "/";
  }

  return `${pathname}${url.search}`;
}

export function resolveProjectPageInput(originUrl: string, pathInput: string): Result<string> {
  const originParsed = parseWebsiteUrl(originUrl);
  if (!originParsed.ok) {
    return originParsed;
  }

  const trimmed = pathInput.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const parsed = parseWebsiteUrl(trimmed);
    if (!parsed.ok) {
      return parsed;
    }

    const host = assertSameProjectHost(parsed.value, originParsed.value.hostname);
    if (!host.ok) {
      return host;
    }

    return { ok: true, value: normalizePageUrl(host.value) };
  }

  if (trimmed.startsWith("//") || trimmed.includes("://") || trimmed.includes("\\")) {
    return {
      ok: false,
      error: createError(
        ERROR_CODES.INVALID_URL,
        "Enter a page path that starts with /, such as /about.",
        { field: "path" },
      ),
    };
  }

  const withSlash = trimmed === "" || trimmed === "/" ? "/" : trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const pathOnly = withSlash.split("#", 1)[0] ?? "/";
  let resolved: URL;
  try {
    resolved = new URL(pathOnly, `${originParsed.value.origin}/`);
  } catch {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_URL, "The page path could not be parsed.", {
        field: "path",
      }),
    };
  }

  if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_URL, "Only HTTP and HTTPS URLs are supported.", {
        field: "path",
      }),
    };
  }

  const host = assertSameProjectHost(resolved, originParsed.value.hostname);
  if (!host.ok) {
    return host;
  }

  return { ok: true, value: normalizePageUrl(host.value) };
}

export function assertSameProjectHost(url: URL, allowedHost: string): Result<URL> {
  if (url.hostname.toLowerCase() !== allowedHost.toLowerCase()) {
    return {
      ok: false,
      error: createError(
        ERROR_CODES.DOMAIN_MISMATCH,
        "Pages in this project must use the same website domain.",
        { field: "url", allowedHost, hostname: url.hostname },
      ),
    };
  }

  return { ok: true, value: url };
}
