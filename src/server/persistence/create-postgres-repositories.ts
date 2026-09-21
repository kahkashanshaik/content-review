import type { PoolClient } from "pg";

import type { SessionRepository, UserRepository } from "../../application/ports/auth.ts";
import type { Repositories } from "../../application/ports/repositories.ts";
import { mapChange, mapContentItem, mapInvite, mapMember, mapPage, mapProject, mapRevision, mapSession, mapSnapshot, mapState, mapUser } from "./map-rows.ts";
import { withClient } from "./pool.ts";

export type PostgresStores = {
  repositories: Repositories;
  users: UserRepository;
  sessions: SessionRepository;
};

export function createPostgresStores(): PostgresStores {
  return {
    repositories: createPostgresRepositories(),
    users: createUserRepository(),
    sessions: createSessionRepository(),
  };
}

export function createPostgresRepositories(): Repositories {
  return {
    projects: {
      getById(id) {
        return one("SELECT * FROM projects WHERE id = $1", [id], mapProject);
      },
      list() {
        return many("SELECT * FROM projects ORDER BY created_at ASC", [], mapProject);
      },
      listByUser(userId) {
        return many(
          "SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at ASC",
          [userId],
          mapProject,
        );
      },
      listAccessible(userId) {
        return many(
          `SELECT DISTINCT p.* FROM projects p
           LEFT JOIN project_members m ON m.project_id = p.id
           WHERE p.user_id = $1 OR m.user_id = $1
           ORDER BY p.created_at ASC`,
          [userId],
          mapProject,
        );
      },
      getByUserAndHost(userId, allowedHost) {
        return one(
          "SELECT * FROM projects WHERE user_id = $1 AND allowed_host = $2",
          [userId, allowedHost],
          mapProject,
        );
      },
      async save(project) {
        await exec(
          `INSERT INTO projects (id, user_id, name, origin_url, allowed_host, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             origin_url = EXCLUDED.origin_url,
             allowed_host = EXCLUDED.allowed_host,
             updated_at = EXCLUDED.updated_at`,
          [
            project.id,
            project.userId,
            project.name,
            project.originUrl,
            project.allowedHost,
            project.createdAt,
            project.updatedAt,
          ],
        );
      },
      async delete(id) {
        await exec("DELETE FROM projects WHERE id = $1", [id]);
      },
    },
    pages: {
      getById(id) {
        return one("SELECT * FROM pages WHERE id = $1", [id], mapPage);
      },
      listByProject(projectId) {
        return many(
          "SELECT * FROM pages WHERE project_id = $1 ORDER BY created_at ASC",
          [projectId],
          mapPage,
        );
      },
      getByProjectAndUrl(projectId, sourceUrl) {
        return one(
          "SELECT * FROM pages WHERE project_id = $1 AND source_url = $2",
          [projectId, sourceUrl],
          mapPage,
        );
      },
      async save(page) {
        await exec(
          `INSERT INTO pages (id, project_id, source_url, title, snapshot_id, unsupported_dynamic, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             source_url = EXCLUDED.source_url,
             title = EXCLUDED.title,
             snapshot_id = EXCLUDED.snapshot_id,
             unsupported_dynamic = EXCLUDED.unsupported_dynamic,
             updated_at = EXCLUDED.updated_at`,
          [
            page.id,
            page.projectId,
            page.sourceUrl,
            page.title ?? null,
            page.snapshotId,
            page.unsupportedDynamic ?? null,
            page.createdAt,
            page.updatedAt,
          ],
        );
      },
      async delete(id) {
        await exec("DELETE FROM pages WHERE id = $1", [id]);
      },
    },
    snapshots: {
      getById(id) {
        return one("SELECT * FROM snapshots WHERE id = $1", [id], mapSnapshot);
      },
      listByPage(pageId) {
        return many(
          "SELECT * FROM snapshots WHERE page_id = $1 ORDER BY created_at ASC",
          [pageId],
          mapSnapshot,
        );
      },
      async save(snapshot) {
        await exec(
          `INSERT INTO snapshots (id, page_id, sanitized_html, created_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET sanitized_html = EXCLUDED.sanitized_html`,
          [snapshot.id, snapshot.pageId, snapshot.sanitizedHtml, snapshot.createdAt],
        );
      },
    },
    states: {
      getById(id) {
        return one("SELECT * FROM page_states WHERE id = $1", [id], mapState);
      },
      listBySnapshot(pageSnapshotId) {
        return many(
          "SELECT * FROM page_states WHERE page_snapshot_id = $1",
          [pageSnapshotId],
          mapState,
        );
      },
      async save(state) {
        await exec(
          `INSERT INTO page_states (id, page_snapshot_id, type, key, label, sanitized_html)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             type = EXCLUDED.type,
             key = EXCLUDED.key,
             label = EXCLUDED.label,
             sanitized_html = EXCLUDED.sanitized_html`,
          [
            state.id,
            state.pageSnapshotId,
            state.type,
            state.key,
            state.label ?? null,
            state.sanitizedHtml ?? null,
          ],
        );
      },
      async deleteBySnapshot(pageSnapshotId) {
        await exec("DELETE FROM page_states WHERE page_snapshot_id = $1", [pageSnapshotId]);
      },
    },
    contentItems: {
      getById(id) {
        return one("SELECT * FROM content_items WHERE id = $1", [id], mapContentItem);
      },
      listByPage(pageId) {
        return many(
          "SELECT * FROM content_items WHERE page_id = $1 ORDER BY item_order ASC",
          [pageId],
          mapContentItem,
        );
      },
      listByState(stateId) {
        return many(
          "SELECT * FROM content_items WHERE state_id = $1 ORDER BY item_order ASC",
          [stateId],
          mapContentItem,
        );
      },
      async save(item) {
        await exec(
          `INSERT INTO content_items (id, page_id, state_id, element_type, original_text, current_text, selector, direction, language, item_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             page_id = EXCLUDED.page_id,
             state_id = EXCLUDED.state_id,
             element_type = EXCLUDED.element_type,
             original_text = EXCLUDED.original_text,
             current_text = EXCLUDED.current_text,
             selector = EXCLUDED.selector,
             direction = EXCLUDED.direction,
             language = EXCLUDED.language,
             item_order = EXCLUDED.item_order`,
          [
            item.id,
            item.pageId,
            item.stateId,
            item.elementType,
            item.originalText,
            item.currentText,
            item.selector ?? null,
            item.direction ?? null,
            item.language ?? null,
            item.order,
          ],
        );
      },
      async deleteByPage(pageId) {
        await exec("DELETE FROM content_items WHERE page_id = $1", [pageId]);
      },
    },
    changes: {
      getById(id) {
        return one("SELECT * FROM content_changes WHERE id = $1", [id], mapChange);
      },
      listByContentItem(contentItemId) {
        return many(
          "SELECT * FROM content_changes WHERE content_item_id = $1 ORDER BY created_at ASC",
          [contentItemId],
          mapChange,
        );
      },
      listByStatus(status) {
        return many(
          "SELECT * FROM content_changes WHERE status = $1 ORDER BY created_at ASC",
          [status],
          mapChange,
        );
      },
      async save(change) {
        await exec(
          `INSERT INTO content_changes (id, content_item_id, original_value, new_value, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             original_value = EXCLUDED.original_value,
             new_value = EXCLUDED.new_value,
             status = EXCLUDED.status,
             updated_at = EXCLUDED.updated_at`,
          [
            change.id,
            change.contentItemId,
            change.originalValue,
            change.newValue,
            change.status,
            change.createdAt,
            change.updatedAt,
          ],
        );
      },
      async delete(id) {
        await exec("DELETE FROM content_changes WHERE id = $1", [id]);
      },
    },
    revisions: {
      getById(id) {
        return one("SELECT * FROM revisions WHERE id = $1", [id], mapRevision);
      },
      listByPage(pageId) {
        return many(
          "SELECT * FROM revisions WHERE page_id = $1 ORDER BY created_at ASC",
          [pageId],
          mapRevision,
        );
      },
      async save(revision) {
        await exec(
          `INSERT INTO revisions (id, page_id, created_at, change_ids)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET change_ids = EXCLUDED.change_ids`,
          [revision.id, revision.pageId, revision.createdAt, revision.changeIds],
        );
      },
    },
    members: {
      getByProjectAndUser(projectId, userId) {
        return one(
          "SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2",
          [projectId, userId],
          mapMember,
        );
      },
      listByProject(projectId) {
        return many(
          "SELECT * FROM project_members WHERE project_id = $1 ORDER BY created_at ASC",
          [projectId],
          mapMember,
        );
      },
      listByUser(userId) {
        return many(
          "SELECT * FROM project_members WHERE user_id = $1 ORDER BY created_at ASC",
          [userId],
          mapMember,
        );
      },
      async save(member) {
        await exec(
          `INSERT INTO project_members (id, project_id, user_id, created_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET
             project_id = EXCLUDED.project_id,
             user_id = EXCLUDED.user_id`,
          [member.id, member.projectId, member.userId, member.createdAt],
        );
      },
    },
    invites: {
      getById(id) {
        return one("SELECT * FROM project_invites WHERE id = $1", [id], mapInvite);
      },
      getByTokenHash(tokenHash) {
        return one("SELECT * FROM project_invites WHERE token_hash = $1", [tokenHash], mapInvite);
      },
      getByProjectAndEmail(projectId, email) {
        return one(
          "SELECT * FROM project_invites WHERE project_id = $1 AND email = $2",
          [projectId, email],
          mapInvite,
        );
      },
      listByProject(projectId) {
        return many(
          "SELECT * FROM project_invites WHERE project_id = $1 ORDER BY created_at ASC",
          [projectId],
          mapInvite,
        );
      },
      async save(invite) {
        await exec(
          `INSERT INTO project_invites (
             id, project_id, email, invited_by_user_id, token_hash, expires_at, accepted_at, created_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email,
             token_hash = EXCLUDED.token_hash,
             expires_at = EXCLUDED.expires_at,
             accepted_at = EXCLUDED.accepted_at`,
          [
            invite.id,
            invite.projectId,
            invite.email,
            invite.invitedByUserId,
            invite.tokenHash,
            invite.expiresAt,
            invite.acceptedAt ?? null,
            invite.createdAt,
          ],
        );
      },
    },
  };
}

function createUserRepository(): UserRepository {
  return {
    getById(id) {
      return one("SELECT * FROM users WHERE id = $1", [id], mapUser);
    },
    getByEmail(email) {
      return one("SELECT * FROM users WHERE email = $1", [email], mapUser);
    },
    async save(user) {
      await exec(
        `INSERT INTO users (id, email, password_hash, password_set, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           password_set = EXCLUDED.password_set,
           updated_at = EXCLUDED.updated_at`,
        [user.id, user.email, user.passwordHash, user.passwordSet, user.createdAt, user.updatedAt],
      );
    },
  };
}

function createSessionRepository(): SessionRepository {
  return {
    getByTokenHash(tokenHash) {
      return one("SELECT * FROM sessions WHERE token_hash = $1", [tokenHash], mapSession);
    },
    async save(session) {
      await exec(
        `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           token_hash = EXCLUDED.token_hash,
           expires_at = EXCLUDED.expires_at`,
        [session.id, session.userId, session.tokenHash, session.expiresAt, session.createdAt],
      );
    },
    async deleteById(id) {
      await exec("DELETE FROM sessions WHERE id = $1", [id]);
    },
  };
}

async function one<T>(
  sql: string,
  values: unknown[],
  map: (row: Record<string, unknown>) => T,
): Promise<T | undefined> {
  return withClient(async (client) => {
    const result = await client.query(sql, values);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row === undefined ? undefined : map(row);
  });
}

async function many<T>(
  sql: string,
  values: unknown[],
  map: (row: Record<string, unknown>) => T,
): Promise<T[]> {
  return withClient(async (client) => {
    const result = await client.query(sql, values);
    return result.rows.map((row) => map(row as Record<string, unknown>));
  });
}

async function exec(sql: string, values: unknown[]): Promise<void> {
  await withClient(async (client: PoolClient) => {
    await client.query(sql, values);
  });
}
