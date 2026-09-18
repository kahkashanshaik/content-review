import Dexie, { type Table } from "dexie";

import type {
  ContentChange,
  ContentItem,
  Page,
  PageSnapshot,
  PageState,
  Project,
  ProjectInvite,
  ProjectMember,
  Revision,
} from "../../../domain/types.ts";

export const CONTENT_REVIEW_DB_NAME = "content-review";
export const CONTENT_REVIEW_DB_VERSION = 2;

export const CONTENT_REVIEW_STORES = {
  projects: "id, userId, allowedHost, createdAt, [userId+allowedHost]",
  pages: "id, projectId, snapshotId, sourceUrl, createdAt, [projectId+sourceUrl]",
  snapshots: "id, pageId, createdAt",
  pageStates: "id, pageSnapshotId, &[pageSnapshotId+key], type",
  contentItems: "id, pageId, stateId, [pageId+stateId], [stateId+order]",
  contentChanges: "id, contentItemId, status, [contentItemId+status], createdAt",
  revisions: "id, pageId, createdAt",
  projectMembers: "id, projectId, userId, createdAt, [projectId+userId]",
  projectInvites: "id, projectId, email, tokenHash, createdAt, [projectId+email]",
} as const;

export class ContentReviewDatabase extends Dexie {
  projects!: Table<Project, string>;
  pages!: Table<Page, string>;
  snapshots!: Table<PageSnapshot, string>;
  pageStates!: Table<PageState, string>;
  contentItems!: Table<ContentItem, string>;
  contentChanges!: Table<ContentChange, string>;
  revisions!: Table<Revision, string>;
  projectMembers!: Table<ProjectMember, string>;
  projectInvites!: Table<ProjectInvite, string>;

  constructor(name = CONTENT_REVIEW_DB_NAME) {
    super(name);
    this.version(CONTENT_REVIEW_DB_VERSION).stores(CONTENT_REVIEW_STORES);
  }
}

export function createContentReviewDatabase(
  name = CONTENT_REVIEW_DB_NAME,
): ContentReviewDatabase {
  return new ContentReviewDatabase(name);
}
