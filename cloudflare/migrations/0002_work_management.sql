-- ASAS 360° Business Suite — Cloudflare D1 Work Management schema, v0.2
-- Scope: per-organization Projects, Sections, Collaborators, Tasks.
-- This schema DOES NOT authorize users; Workers must verify JWT, membership,
-- project/section permissions and resource ownership on every API operation.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS wm_projects (
  organization_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','paused','completed','archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(organization_id,id),
  FOREIGN KEY(organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY(organization_id,owner_user_id) REFERENCES memberships(organization_id,user_id)
);
CREATE INDEX IF NOT EXISTS wm_projects_by_owner ON wm_projects(organization_id,owner_user_id,status);

CREATE TABLE IF NOT EXISTS wm_project_members (
  organization_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK(permission IN('owner','editor','commenter','viewer')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(organization_id,project_id,user_id),
  FOREIGN KEY(organization_id,project_id) REFERENCES wm_projects(organization_id,id) ON DELETE CASCADE,
  FOREIGN KEY(organization_id,user_id) REFERENCES memberships(organization_id,user_id)
);

CREATE TABLE IF NOT EXISTS wm_sections (
  organization_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(organization_id,project_id,id),
  FOREIGN KEY(organization_id,project_id) REFERENCES wm_projects(organization_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS wm_sections_by_position ON wm_sections(organization_id,project_id,sort_order);

CREATE TABLE IF NOT EXISTS wm_section_collaborators (
  organization_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK(permission IN('edit','comment','view')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(organization_id,project_id,section_id,user_id),
  FOREIGN KEY(organization_id,project_id,section_id) REFERENCES wm_sections(organization_id,project_id,id) ON DELETE CASCADE,
  FOREIGN KEY(organization_id,user_id) REFERENCES memberships(organization_id,user_id)
);

CREATE TABLE IF NOT EXISTS wm_tasks (
  organization_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  assignee_user_id TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN('normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open','done','cancelled')),
  due_date TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  crm_account_id TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(organization_id,project_id,id),
  FOREIGN KEY(organization_id,project_id,section_id) REFERENCES wm_sections(organization_id,project_id,id),
  FOREIGN KEY(organization_id,assignee_user_id) REFERENCES memberships(organization_id,user_id),
  FOREIGN KEY(organization_id,created_by_user_id) REFERENCES memberships(organization_id,user_id),
  FOREIGN KEY(organization_id,crm_account_id) REFERENCES crm_accounts(organization_id,id)
);
CREATE INDEX IF NOT EXISTS wm_tasks_section_sort ON wm_tasks(organization_id,project_id,section_id,sort_order);
CREATE INDEX IF NOT EXISTS wm_tasks_user_due ON wm_tasks(organization_id,assignee_user_id,status,due_date);

CREATE TABLE IF NOT EXISTS wm_task_watchers (
  organization_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(organization_id,project_id,task_id,user_id),
  FOREIGN KEY(organization_id,project_id,task_id) REFERENCES wm_tasks(organization_id,project_id,id) ON DELETE CASCADE,
  FOREIGN KEY(organization_id,user_id) REFERENCES memberships(organization_id,user_id)
);
