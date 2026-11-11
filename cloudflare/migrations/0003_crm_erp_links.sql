CREATE TABLE IF NOT EXISTS crm_erp_customer_links (
  organization_id TEXT NOT NULL,
  crm_account_id TEXT NOT NULL,
  erp_customer TEXT NOT NULL,
  linked_by TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (organization_id, crm_account_id),
  UNIQUE (organization_id, erp_customer),
  FOREIGN KEY (organization_id, crm_account_id)
    REFERENCES crm_accounts(organization_id, id) ON DELETE CASCADE
);
