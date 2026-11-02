-- ASAS Business Suite — Cloudflare D1 / SQLite staging schema, v0.1.
-- NEW ASAS-ONLY database. Do not apply to unrelated projects.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- user_id is a future verified auth identity id; never pass an unverified client-supplied value.
CREATE TABLE IF NOT EXISTS memberships (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','manager','sales','viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','revoked')),
  granted_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (organization_id,user_id)
);
CREATE INDEX IF NOT EXISTS memberships_user_status ON memberships(user_id,status);

CREATE TABLE IF NOT EXISTS crm_accounts (
  id TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'lead',
  owner_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (organization_id,id)
);
CREATE INDEX IF NOT EXISTS crm_accounts_org_owner ON crm_accounts(organization_id,owner_user_id);
CREATE INDEX IF NOT EXISTS crm_accounts_org_stage ON crm_accounts(organization_id,stage);

CREATE TABLE IF NOT EXISTS crm_contacts (
  id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (organization_id,id),
  FOREIGN KEY (organization_id,account_id) REFERENCES crm_accounts(organization_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS crm_contacts_account ON crm_contacts(organization_id,account_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT REFERENCES organizations(id),
  actor_user_id TEXT,
  event_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS audit_events_org_time ON audit_events(organization_id,created_at);

-- Platform-wide paid advertising inventory (no organization-level editing).
-- Approved campaigns only become "active" via a platform-controlled administrative API.
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id TEXT PRIMARY KEY NOT NULL,
  advertiser_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL CHECK (format IN ('motion','video')),
  destination_url TEXT,
  r2_media_key TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','active','paused','expired','rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK(ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS ads_status_window ON ad_campaigns(status,starts_at,ends_at);

-- Hard inventory cap: 5 paid active campaign records across the WHOLE platform.
-- The ASAS house ad is served from code and never occupies a paid slot.
CREATE TRIGGER IF NOT EXISTS max_five_active_campaigns_insert
BEFORE INSERT ON ad_campaigns
WHEN NEW.status = 'active'
BEGIN
 SELECT RAISE(ABORT,'At most five active paid ad campaigns')
 WHERE (SELECT COUNT(*) FROM ad_campaigns WHERE status = 'active') >= 5;
END;

CREATE TRIGGER IF NOT EXISTS max_five_active_campaigns_update
BEFORE UPDATE OF status ON ad_campaigns
WHEN NEW.status = 'active' AND OLD.status <> 'active'
BEGIN
 SELECT RAISE(ABORT,'At most five active paid ad campaigns')
 WHERE (SELECT COUNT(*) FROM ad_campaigns WHERE status = 'active') >= 5;
END;
