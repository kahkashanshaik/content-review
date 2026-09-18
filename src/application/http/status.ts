import type { AppError } from "../../domain/errors.ts";
import { ERROR_CODES } from "../../domain/errors.ts";

export function httpStatusForError(error: AppError): number {
  switch (error.code) {
    case ERROR_CODES.NOT_IMPLEMENTED:
      return 501;
    case ERROR_CODES.SSRF_BLOCKED:
      return 403;
    case ERROR_CODES.REQUEST_TIMEOUT:
      return 504;
    case ERROR_CODES.TOO_MANY_REDIRECTS:
    case ERROR_CODES.RESPONSE_TOO_LARGE:
    case ERROR_CODES.NOT_HTML:
    case ERROR_CODES.UNSUPPORTED_DYNAMIC_CONTENT:
      return 422;
    case ERROR_CODES.UNAUTHORIZED:
      return 401;
    case ERROR_CODES.FORBIDDEN:
      return 403;
    case ERROR_CODES.NOT_FOUND:
      return 404;
    case ERROR_CODES.CONFLICT:
      return 409;
    case ERROR_CODES.INVALID_URL:
    case ERROR_CODES.VALIDATION_ERROR:
    case ERROR_CODES.DOMAIN_MISMATCH:
      return 400;
    case ERROR_CODES.FETCH_FAILED:
      return 502;
    default: {
      const exhaustive: never = error.code;
      return exhaustive;
    }
  }
}
