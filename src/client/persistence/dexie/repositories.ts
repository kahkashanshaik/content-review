import type {
  ContentChangeRepository,
  ContentItemRepository,
  PageRepository,
  PageSnapshotRepository,
  PageStateRepository,
  ProjectInviteRepository,
  ProjectMemberRepository,
  ProjectRepository,
  RevisionRepository,
} from "../../../application/ports/repositories.ts";
import type { ContentReviewDatabase } from "./database.ts";
import type { Project } from "../../../domain/types.ts";

export function createProjectRepository(
  db: ContentReviewDatabase,
): ProjectRepository {
  return {
    getById(id) {
      return db.projects.get(id);
    },
    list() {
      return db.projects.orderBy("createdAt").toArray();
    },
    listByUser(userId) {
      return db.projects.where("userId").equals(userId).sortBy("createdAt");
    },
    async listAccessible(userId) {
      const owned = await db.projects.where("userId").equals(userId).toArray();
      const memberships = await db.projectMembers.where("userId").equals(userId).toArray();
      const invited: Project[] = [];
      for (const membership of memberships) {
        const project = await db.projects.get(membership.projectId);
        if (project !== undefined && project.userId !== userId) {
          invited.push(project);
        }
      }
      return [...owned, ...invited].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async getByUserAndHost(userId, allowedHost) {
      const owned = await db.projects.where("userId").equals(userId).toArray();
      return owned.find((project) => project.allowedHost === allowedHost);
    },
    async save(project) {
      await db.projects.put(project);
    },
    async delete(id) {
      await db.projects.delete(id);
      await db.projectMembers.where("projectId").equals(id).delete();
      await db.projectInvites.where("projectId").equals(id).delete();
    },
  };
}

export function createPageRepository(db: ContentReviewDatabase): PageRepository {
  return {
    getById(id) {
      return db.pages.get(id);
    },
    listByProject(projectId) {
      return db.pages.where("projectId").equals(projectId).sortBy("createdAt");
    },
    async getByProjectAndUrl(projectId, sourceUrl) {
      return db.pages.where("[projectId+sourceUrl]").equals([projectId, sourceUrl]).first();
    },
    async save(page) {
      await db.pages.put(page);
    },
  };
}

export function createPageSnapshotRepository(
  db: ContentReviewDatabase,
): PageSnapshotRepository {
  return {
    getById(id) {
      return db.snapshots.get(id);
    },
    listByPage(pageId) {
      return db.snapshots.where("pageId").equals(pageId).sortBy("createdAt");
    },
    async save(snapshot) {
      await db.snapshots.put(snapshot);
    },
  };
}

export function createPageStateRepository(
  db: ContentReviewDatabase,
): PageStateRepository {
  return {
    getById(id) {
      return db.pageStates.get(id);
    },
    listBySnapshot(pageSnapshotId) {
      return db.pageStates.where("pageSnapshotId").equals(pageSnapshotId).toArray();
    },
    async save(state) {
      await db.pageStates.put(state);
    },
    async deleteBySnapshot(pageSnapshotId) {
      await db.pageStates.where("pageSnapshotId").equals(pageSnapshotId).delete();
    },
  };
}

export function createContentItemRepository(
  db: ContentReviewDatabase,
): ContentItemRepository {
  return {
    getById(id) {
      return db.contentItems.get(id);
    },
    listByPage(pageId) {
      return db.contentItems.where("pageId").equals(pageId).sortBy("order");
    },
    listByState(stateId) {
      return db.contentItems.where("stateId").equals(stateId).sortBy("order");
    },
    async save(item) {
      await db.contentItems.put(item);
    },
    async deleteByPage(pageId) {
      await db.contentItems.where("pageId").equals(pageId).delete();
    },
  };
}

export function createContentChangeRepository(
  db: ContentReviewDatabase,
): ContentChangeRepository {
  return {
    getById(id) {
      return db.contentChanges.get(id);
    },
    listByContentItem(contentItemId) {
      return db.contentChanges
        .where("contentItemId")
        .equals(contentItemId)
        .sortBy("createdAt");
    },
    listByStatus(status) {
      return db.contentChanges.where("status").equals(status).sortBy("createdAt");
    },
    async save(change) {
      await db.contentChanges.put(change);
    },
    async delete(id) {
      await db.contentChanges.delete(id);
    },
  };
}

export function createRevisionRepository(
  db: ContentReviewDatabase,
): RevisionRepository {
  return {
    getById(id) {
      return db.revisions.get(id);
    },
    listByPage(pageId) {
      return db.revisions.where("pageId").equals(pageId).sortBy("createdAt");
    },
    async save(revision) {
      await db.revisions.put(revision);
    },
  };
}

export function createProjectMemberRepository(
  db: ContentReviewDatabase,
): ProjectMemberRepository {
  return {
    async getByProjectAndUser(projectId, userId) {
      return db.projectMembers.where("[projectId+userId]").equals([projectId, userId]).first();
    },
    listByProject(projectId) {
      return db.projectMembers.where("projectId").equals(projectId).sortBy("createdAt");
    },
    listByUser(userId) {
      return db.projectMembers.where("userId").equals(userId).sortBy("createdAt");
    },
    async save(member) {
      await db.projectMembers.put(member);
    },
  };
}

export function createProjectInviteRepository(
  db: ContentReviewDatabase,
): ProjectInviteRepository {
  return {
    getById(id) {
      return db.projectInvites.get(id);
    },
    async getByTokenHash(tokenHash) {
      return db.projectInvites.where("tokenHash").equals(tokenHash).first();
    },
    async getByProjectAndEmail(projectId, email) {
      return db.projectInvites.where("[projectId+email]").equals([projectId, email]).first();
    },
    listByProject(projectId) {
      return db.projectInvites.where("projectId").equals(projectId).sortBy("createdAt");
    },
    async save(invite) {
      await db.projectInvites.put(invite);
    },
  };
}
