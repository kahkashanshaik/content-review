export const EXTRACTABLE_ELEMENT_TYPES = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "a",
  "button",
  "li",
  "label",
  "figcaption",
  "blockquote",
] as const;

export type ExtractableElementType = (typeof EXTRACTABLE_ELEMENT_TYPES)[number];

export type TextDirection = "ltr" | "rtl" | "auto";

export type PageStateType =
  | "default"
  | "carousel"
  | "tab"
  | "accordion"
  | "modal"
  | "dropdown"
  | "show-hide";

export const PAGE_STATE_TYPES: readonly PageStateType[] = [
  "default",
  "carousel",
  "tab",
  "accordion",
  "modal",
  "dropdown",
  "show-hide",
];

export type ChangeStatus = "pending" | "accepted" | "rejected";

export type ProjectRole = "owner" | "member";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  passwordSet: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  createdAt: string;
};

export type ProjectInvite = {
  id: string;
  projectId: string;
  email: string;
  invitedByUserId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
};

export type Session = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
};

export type Project = {
  id: string;
  userId: string;
  name: string;
  originUrl: string;
  allowedHost: string;
  createdAt: string;
  updatedAt: string;
};

export type Page = {
  id: string;
  projectId: string;
  sourceUrl: string;
  title?: string;
  snapshotId: string;
  createdAt: string;
  updatedAt: string;
  unsupportedDynamic?: string[];
};

export type PageSnapshot = {
  id: string;
  pageId: string;
  sanitizedHtml: string;
  createdAt: string;
};

export type PageState = {
  id: string;
  pageSnapshotId: string;
  type: PageStateType;
  key: string;
  label?: string;
  sanitizedHtml?: string;
};

export type ContentItem = {
  id: string;
  pageId: string;
  stateId: string;
  elementType: ExtractableElementType;
  originalText: string;
  currentText: string;
  selector?: string;
  direction?: TextDirection;
  language?: string;
  order: number;
};

export type ContentChange = {
  id: string;
  contentItemId: string;
  originalValue: string;
  newValue: string;
  status: ChangeStatus;
  createdAt: string;
  updatedAt: string;
};

export type Revision = {
  id: string;
  pageId: string;
  createdAt: string;
  changeIds: string[];
};
