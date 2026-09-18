CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  origin_url TEXT NOT NULL,
  allowed_host TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, allowed_host)
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  title TEXT,
  snapshot_id TEXT NOT NULL,
  unsupported_dynamic TEXT[],
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (project_id, source_url)
);

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  sanitized_html TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS page_states (
  id TEXT PRIMARY KEY,
  page_snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT,
  sanitized_html TEXT,
  UNIQUE (page_snapshot_id, key)
);

CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  state_id TEXT NOT NULL REFERENCES page_states(id) ON DELETE CASCADE,
  element_type TEXT NOT NULL,
  original_text TEXT NOT NULL,
  current_text TEXT NOT NULL,
  selector TEXT,
  direction TEXT,
  language TEXT,
  item_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS content_changes (
  id TEXT PRIMARY KEY,
  content_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  original_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  change_ids TEXT[] NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS pages_project_id_idx ON pages(project_id);
CREATE INDEX IF NOT EXISTS snapshots_page_id_idx ON snapshots(page_id);
CREATE INDEX IF NOT EXISTS page_states_snapshot_id_idx ON page_states(page_snapshot_id);
CREATE INDEX IF NOT EXISTS content_items_page_id_idx ON content_items(page_id);
CREATE INDEX IF NOT EXISTS content_items_state_id_idx ON content_items(state_id);
CREATE INDEX IF NOT EXISTS content_changes_item_id_idx ON content_changes(content_item_id);
CREATE INDEX IF NOT EXISTS revisions_page_id_idx ON revisions(page_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_invites (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (project_id, email)
);

CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON project_members(user_id);
CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON project_members(project_id);
CREATE INDEX IF NOT EXISTS project_invites_token_hash_idx ON project_invites(token_hash);
