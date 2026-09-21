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
} from "../../domain/types.ts";
import type { Repositories } from "../../application/ports/repositories.ts";

export function createMemoryRepositories(): Repositories {
  const projects = new Map<string, Project>();
  const pages = new Map<string, Page>();
  const snapshots = new Map<string, PageSnapshot>();
  const states = new Map<string, PageState>();
  const contentItems = new Map<string, ContentItem>();
  const changes = new Map<string, ContentChange>();
  const revisions = new Map<string, Revision>();
  const members = new Map<string, ProjectMember>();
  const invites = new Map<string, ProjectInvite>();

  async function deletePageGraph(pageId: string): Promise<void> {
    pages.delete(pageId);

    const snapshotIds: string[] = [];
    for (const [snapshotId, snapshot] of snapshots) {
      if (snapshot.pageId === pageId) {
        snapshotIds.push(snapshotId);
        snapshots.delete(snapshotId);
      }
    }

    const snapshotIdSet = new Set(snapshotIds);
    for (const [stateId, state] of states) {
      if (snapshotIdSet.has(state.pageSnapshotId)) {
        states.delete(stateId);
      }
    }

    const itemIds: string[] = [];
    for (const [itemId, item] of contentItems) {
      if (item.pageId === pageId) {
        itemIds.push(itemId);
        contentItems.delete(itemId);
      }
    }

    const itemIdSet = new Set(itemIds);
    for (const [changeId, change] of changes) {
      if (itemIdSet.has(change.contentItemId)) {
        changes.delete(changeId);
      }
    }

    for (const [revisionId, revision] of revisions) {
      if (revision.pageId === pageId) {
        revisions.delete(revisionId);
      }
    }
  }

  return {
    projects: {
      async getById(id) {
        return projects.get(id);
      },
      async list() {
        return [...projects.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async listByUser(userId) {
        return [...projects.values()]
          .filter((project) => project.userId === userId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async listAccessible(userId) {
        const owned = [...projects.values()].filter((project) => project.userId === userId);
        const memberIds = new Set(
          [...members.values()].filter((member) => member.userId === userId).map((member) => member.projectId),
        );
        const invited = [...projects.values()].filter(
          (project) => project.userId !== userId && memberIds.has(project.id),
        );
        return [...owned, ...invited].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async getByUserAndHost(userId, allowedHost) {
        return [...projects.values()].find(
          (project) => project.userId === userId && project.allowedHost === allowedHost,
        );
      },
      async save(project) {
        projects.set(project.id, project);
      },
      async delete(id) {
        projects.delete(id);
        for (const [memberId, member] of members) {
          if (member.projectId === id) {
            members.delete(memberId);
          }
        }
        for (const [inviteId, invite] of invites) {
          if (invite.projectId === id) {
            invites.delete(inviteId);
          }
        }
      },
    },
    pages: {
      async getById(id) {
        return pages.get(id);
      },
      async listByProject(projectId) {
        return [...pages.values()]
          .filter((page) => page.projectId === projectId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async getByProjectAndUrl(projectId, sourceUrl) {
        return [...pages.values()].find(
          (page) => page.projectId === projectId && page.sourceUrl === sourceUrl,
        );
      },
      async save(page) {
        pages.set(page.id, page);
      },
      async delete(id) {
        await deletePageGraph(id);
      },
    },
    snapshots: {
      async getById(id) {
        return snapshots.get(id);
      },
      async listByPage(pageId) {
        return [...snapshots.values()]
          .filter((snapshot) => snapshot.pageId === pageId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async save(snapshot) {
        snapshots.set(snapshot.id, snapshot);
      },
    },
    states: {
      async getById(id) {
        return states.get(id);
      },
      async listBySnapshot(pageSnapshotId) {
        return [...states.values()].filter((state) => state.pageSnapshotId === pageSnapshotId);
      },
      async save(state) {
        states.set(state.id, state);
      },
      async deleteBySnapshot(pageSnapshotId) {
        for (const [id, state] of states) {
          if (state.pageSnapshotId === pageSnapshotId) {
            states.delete(id);
          }
        }
      },
    },
    contentItems: {
      async getById(id) {
        return contentItems.get(id);
      },
      async listByPage(pageId) {
        return [...contentItems.values()]
          .filter((item) => item.pageId === pageId)
          .sort((a, b) => a.order - b.order);
      },
      async listByState(stateId) {
        return [...contentItems.values()]
          .filter((item) => item.stateId === stateId)
          .sort((a, b) => a.order - b.order);
      },
      async save(item) {
        contentItems.set(item.id, item);
      },
      async deleteByPage(pageId) {
        for (const [id, item] of contentItems) {
          if (item.pageId === pageId) {
            contentItems.delete(id);
          }
        }
      },
    },
    changes: {
      async getById(id) {
        return changes.get(id);
      },
      async listByContentItem(contentItemId) {
        return [...changes.values()]
          .filter((change) => change.contentItemId === contentItemId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async listByStatus(status) {
        return [...changes.values()]
          .filter((change) => change.status === status)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async save(change) {
        changes.set(change.id, change);
      },
      async delete(id) {
        changes.delete(id);
      },
    },
    revisions: {
      async getById(id) {
        return revisions.get(id);
      },
      async listByPage(pageId) {
        return [...revisions.values()]
          .filter((revision) => revision.pageId === pageId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async save(revision) {
        revisions.set(revision.id, revision);
      },
    },
    members: {
      async getByProjectAndUser(projectId, userId) {
        return [...members.values()].find(
          (member) => member.projectId === projectId && member.userId === userId,
        );
      },
      async listByProject(projectId) {
        return [...members.values()]
          .filter((member) => member.projectId === projectId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async listByUser(userId) {
        return [...members.values()]
          .filter((member) => member.userId === userId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async save(member) {
        members.set(member.id, member);
      },
    },
    invites: {
      async getById(id) {
        return invites.get(id);
      },
      async getByTokenHash(tokenHash) {
        return [...invites.values()].find((invite) => invite.tokenHash === tokenHash);
      },
      async getByProjectAndEmail(projectId, email) {
        return [...invites.values()].find(
          (invite) => invite.projectId === projectId && invite.email === email,
        );
      },
      async listByProject(projectId) {
        return [...invites.values()]
          .filter((invite) => invite.projectId === projectId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async save(invite) {
        invites.set(invite.id, invite);
      },
    },
  };
}
