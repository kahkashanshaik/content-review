const ID_PREFIXES = {
  user: "user",
  session: "session",
  project: "project",
  member: "member",
  invite: "invite",
  page: "page",
  snapshot: "snapshot",
  state: "state",
  content: "content",
  change: "change",
  revision: "revision",
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

const PREFIX_PATTERN =
  /^(user|session|project|member|invite|page|snapshot|state|content|change|revision)$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createId(prefix: IdPrefix): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

const STABLE_CONTENT_ID = /^content_[0-9a-f]{32}$/i;

export function isContentId(value: string): boolean {
  return isId(value, "content") || STABLE_CONTENT_ID.test(value);
}

export function isId(value: string, prefix?: IdPrefix): boolean {
  const separator = value.indexOf("_");
  if (separator <= 0) {
    return false;
  }

  const actualPrefix = value.slice(0, separator);
  const uuid = value.slice(separator + 1);

  if (!PREFIX_PATTERN.test(actualPrefix)) {
    return false;
  }

  if (prefix !== undefined && actualPrefix !== prefix) {
    return false;
  }

  return UUID_PATTERN.test(uuid);
}

export const idPrefixes = ID_PREFIXES;
