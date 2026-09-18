export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  const separator = normalized.lastIndexOf("@");
  if (separator <= 0 || separator === normalized.length - 1) {
    return false;
  }

  const local = normalized.slice(0, separator);
  const domain = normalized.slice(separator + 1);
  return (
    local.length > 0 &&
    domain.includes(".") &&
    !normalized.includes(" ") &&
    normalized.length <= 254
  );
}
