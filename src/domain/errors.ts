export const ERROR_CODES = {
  INVALID_URL: "INVALID_URL",
  SSRF_BLOCKED: "SSRF_BLOCKED",
  REQUEST_TIMEOUT: "REQUEST_TIMEOUT",
  TOO_MANY_REDIRECTS: "TOO_MANY_REDIRECTS",
  RESPONSE_TOO_LARGE: "RESPONSE_TOO_LARGE",
  NOT_HTML: "NOT_HTML",
  UNSUPPORTED_DYNAMIC_CONTENT: "UNSUPPORTED_DYNAMIC_CONTENT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DOMAIN_MISMATCH: "DOMAIN_MISMATCH",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  NOT_FOUND: "NOT_FOUND",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  FETCH_FAILED: "FETCH_FAILED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type AppError = {
  code: ErrorCode;
  message: string;
  details?: Readonly<Record<string, string>>;
};

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function createError(
  code: ErrorCode,
  message: string,
  details?: Readonly<Record<string, string>>,
): AppError {
  if (details === undefined) {
    return { code, message };
  }

  return { code, message, details };
}

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.code === "string" &&
    record.code in ERROR_CODES &&
    typeof record.message === "string" &&
    (record.details === undefined || isStringRecord(record.details))
  );
}

export function toErrorResponseBody(error: AppError): { error: AppError } {
  return { error };
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "string");
}
