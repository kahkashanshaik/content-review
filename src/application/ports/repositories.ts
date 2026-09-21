import type {
  ChangeStatus,
  ContentChange,
  ContentItem,
  Page,
  PageSnapshot,
  PageState,
  Project,
  ProjectInvite,
  ProjectMember,
  Revision,
} from "../../domain/types.ts";

export interface ProjectRepository {
  getById(id: string): Promise<Project | undefined>;
  list(): Promise<Project[]>;
  listByUser(userId: string): Promise<Project[]>;
  listAccessible(userId: string): Promise<Project[]>;
  getByUserAndHost(userId: string, allowedHost: string): Promise<Project | undefined>;
  save(project: Project): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface PageRepository {
  getById(id: string): Promise<Page | undefined>;
  listByProject(projectId: string): Promise<Page[]>;
  getByProjectAndUrl(projectId: string, sourceUrl: string): Promise<Page | undefined>;
  save(page: Page): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface PageSnapshotRepository {
  getById(id: string): Promise<PageSnapshot | undefined>;
  listByPage(pageId: string): Promise<PageSnapshot[]>;
  save(snapshot: PageSnapshot): Promise<void>;
}

export interface PageStateRepository {
  getById(id: string): Promise<PageState | undefined>;
  listBySnapshot(pageSnapshotId: string): Promise<PageState[]>;
  save(state: PageState): Promise<void>;
  deleteBySnapshot(pageSnapshotId: string): Promise<void>;
}

export interface ContentItemRepository {
  getById(id: string): Promise<ContentItem | undefined>;
  listByPage(pageId: string): Promise<ContentItem[]>;
  listByState(stateId: string): Promise<ContentItem[]>;
  save(item: ContentItem): Promise<void>;
  deleteByPage(pageId: string): Promise<void>;
}

export interface ContentChangeRepository {
  getById(id: string): Promise<ContentChange | undefined>;
  listByContentItem(contentItemId: string): Promise<ContentChange[]>;
  listByStatus(status: ChangeStatus): Promise<ContentChange[]>;
  save(change: ContentChange): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface RevisionRepository {
  getById(id: string): Promise<Revision | undefined>;
  listByPage(pageId: string): Promise<Revision[]>;
  save(revision: Revision): Promise<void>;
}

export interface ProjectMemberRepository {
  getByProjectAndUser(projectId: string, userId: string): Promise<ProjectMember | undefined>;
  listByProject(projectId: string): Promise<ProjectMember[]>;
  listByUser(userId: string): Promise<ProjectMember[]>;
  save(member: ProjectMember): Promise<void>;
}

export interface ProjectInviteRepository {
  getById(id: string): Promise<ProjectInvite | undefined>;
  getByTokenHash(tokenHash: string): Promise<ProjectInvite | undefined>;
  getByProjectAndEmail(projectId: string, email: string): Promise<ProjectInvite | undefined>;
  listByProject(projectId: string): Promise<ProjectInvite[]>;
  save(invite: ProjectInvite): Promise<void>;
}

export type Repositories = {
  projects: ProjectRepository;
  pages: PageRepository;
  snapshots: PageSnapshotRepository;
  states: PageStateRepository;
  contentItems: ContentItemRepository;
  changes: ContentChangeRepository;
  revisions: RevisionRepository;
  members: ProjectMemberRepository;
  invites: ProjectInviteRepository;
};
