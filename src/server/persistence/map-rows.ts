import type {
  ContentChange,
  ContentItem,
  Page,
  PageSnapshot,
  PageState,
  PageStateType,
  Project,
  ProjectInvite,
  ProjectMember,
  Revision,
  Session,
  User,
} from "../../domain/types.ts";
import type { ExtractableElementType, TextDirection, ChangeStatus } from "../../domain/types.ts";

export function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    passwordSet: row.password_set !== false && row.password_set !== "f",
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapSession(row: Record<string, unknown>): Session {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    tokenHash: String(row.token_hash),
    expiresAt: toIso(row.expires_at),
    createdAt: toIso(row.created_at),
  };
}

export function mapProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    originUrl: String(row.origin_url),
    allowedHost: String(row.allowed_host),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapPage(row: Record<string, unknown>): Page {
  const unsupported = Array.isArray(row.unsupported_dynamic)
    ? row.unsupported_dynamic.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    id: String(row.id),
    projectId: String(row.project_id),
    sourceUrl: String(row.source_url),
    snapshotId: String(row.snapshot_id),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    ...(typeof row.title === "string" && row.title.length > 0 ? { title: row.title } : {}),
    ...(unsupported.length > 0 ? { unsupportedDynamic: unsupported } : {}),
  };
}

export function mapSnapshot(row: Record<string, unknown>): PageSnapshot {
  return {
    id: String(row.id),
    pageId: String(row.page_id),
    sanitizedHtml: String(row.sanitized_html),
    createdAt: toIso(row.created_at),
  };
}

export function mapState(row: Record<string, unknown>): PageState {
  return {
    id: String(row.id),
    pageSnapshotId: String(row.page_snapshot_id),
    type: row.type as PageStateType,
    key: String(row.key),
    ...(typeof row.label === "string" && row.label.length > 0 ? { label: row.label } : {}),
    ...(typeof row.sanitized_html === "string" ? { sanitizedHtml: row.sanitized_html } : {}),
  };
}

export function mapContentItem(row: Record<string, unknown>): ContentItem {
  return {
    id: String(row.id),
    pageId: String(row.page_id),
    stateId: String(row.state_id),
    elementType: row.element_type as ExtractableElementType,
    originalText: String(row.original_text),
    currentText: String(row.current_text),
    order: Number(row.item_order),
    ...(typeof row.selector === "string" ? { selector: row.selector } : {}),
    ...(typeof row.direction === "string" ? { direction: row.direction as TextDirection } : {}),
    ...(typeof row.language === "string" ? { language: row.language } : {}),
  };
}

export function mapChange(row: Record<string, unknown>): ContentChange {
  return {
    id: String(row.id),
    contentItemId: String(row.content_item_id),
    originalValue: String(row.original_value),
    newValue: String(row.new_value),
    status: row.status as ChangeStatus,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapRevision(row: Record<string, unknown>): Revision {
  const changeIds = Array.isArray(row.change_ids)
    ? row.change_ids.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    id: String(row.id),
    pageId: String(row.page_id),
    createdAt: toIso(row.created_at),
    changeIds,
  };
}

function toIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

export function mapMember(row: Record<string, unknown>): ProjectMember {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    userId: String(row.user_id),
    createdAt: toIso(row.created_at),
  };
}

export function mapInvite(row: Record<string, unknown>): ProjectInvite {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    email: String(row.email),
    invitedByUserId: String(row.invited_by_user_id),
    tokenHash: String(row.token_hash),
    expiresAt: toIso(row.expires_at),
    createdAt: toIso(row.created_at),
    ...(row.accepted_at == null ? {} : { acceptedAt: toIso(row.accepted_at) }),
  };
}
