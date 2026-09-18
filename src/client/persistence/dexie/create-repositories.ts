import type { Repositories } from "../../../application/ports/repositories.ts";
import type { ContentReviewDatabase } from "./database.ts";
import {
  createContentChangeRepository,
  createContentItemRepository,
  createPageRepository,
  createPageSnapshotRepository,
  createPageStateRepository,
  createProjectInviteRepository,
  createProjectMemberRepository,
  createProjectRepository,
  createRevisionRepository,
} from "./repositories.ts";

export function createDexieRepositories(db: ContentReviewDatabase): Repositories {
  return {
    projects: createProjectRepository(db),
    pages: createPageRepository(db),
    snapshots: createPageSnapshotRepository(db),
    states: createPageStateRepository(db),
    contentItems: createContentItemRepository(db),
    changes: createContentChangeRepository(db),
    revisions: createRevisionRepository(db),
    members: createProjectMemberRepository(db),
    invites: createProjectInviteRepository(db),
  };
}
