export function isHtmlContentType(contentType: string | undefined): boolean {
  if (contentType === undefined) {
    return false;
  }

  const mediaType = contentType.split(";")[0]?.trim().toLowerCase();
  return mediaType === "text/html" || mediaType === "application/xhtml+xml";
}

export function isCssContentType(contentType: string | undefined): boolean {
  if (contentType === undefined) {
    return false;
  }

  const mediaType = contentType.split(";")[0]?.trim().toLowerCase();
  return mediaType === "text/css";
}

export function decodeHtmlBody(body: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(body);
}

export function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
