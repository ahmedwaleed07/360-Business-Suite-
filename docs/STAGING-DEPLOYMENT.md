# Cloudflare-first staging deployment — operator reference

This document covers the existing ASAS-only Cloudflare resources (created 2 Nov 2026).

## Resources confirmed

- D1: `asas-business-suite-staging` (EEUR)
- Worker script: `asas-business-suite-staging`
- Workers.dev: enabled
- Worker bindings: `DB` (D1) and `PUBLIC_PREVIEW_ORIGIN` (plain-text `https://ahmedwaleed07.github.io`)
- GitHub repository: `ahmedwaleed07/360-Business-Suite-` (Public)
- Live-test SQL fixtures were cleaned up; no real tenant/account rows were added.

Endpoints:
- `GET /health` — staging status, no sensitive details
- `GET /public/ads` — up to 5 active campaigns or ASAS 360° house ad; only public fields
- `GET /pilot/` — internal same-origin CRM UI, requires a valid Access session
- `GET /api/organizations` — active organizations and roles for the signed-in user
- `GET /api/organizations/:orgId/crm/accounts` — requires valid Cloudflare Access JWT and active membership
- `POST /api/organizations/:orgId/crm/accounts` — requires valid JWT and an authorized membership; uses D1 batch audit log

The Worker has no `ACCESS_TEAM_DOMAIN` or `ACCESS_AUD` configured yet, so its protected API routes return HTTP 503 rather than allowing access. This is intentional.

## What must be configured before staging authenticated use

1. Enable Access in Cloudflare Zero Trust. Use a private hostname on this Worker protected by one Access application covering both `/pilot/` and `/api/*` with the same audience. Keep the existing public ads hostname available. Allow only explicitly authorized pilot users.
2. Add exact `ACCESS_TEAM_DOMAIN` (https://<team>.cloudflareaccess.com) and `ACCESS_AUD` (application AUD) to the Worker configuration; never guess them.
3. Establish a signed-in test user's Access JWT subject, then create an **explicit active membership** in the ASAS staging D1 database using a controlled operator workflow.
4. Confirm JWT signature/issuer/audience/expiry verification and cross-tenant access denial with real HTTP requests.
5. Open `/pilot/` on the Access hostname. Check the company selector and customer list against the membership, then verify record creation and the audit event. The public GitHub Pages preview continues to use synthetic records.

This private Access gate is for pilot and administration only; a complete customer identity, invitations and account management system still needs to be implemented for commercial SaaS.

## Source and deployment

`cloudflare/src/index.js` is the Worker entry point. `cloudflare/src/pilot.js` contains the same-origin CRM pilot. D1 staging has the core and work-management schemas (`0001` and `0002`). The latter prepares tables only. Work-management API and UI wiring are pending.

`cloudflare/wrangler.example.jsonc` demonstrates the binding shape, but intentionally uses a placeholder database identifier. Never overwrite production secrets in git.

Cloudflare API confirms deployment success and that workers.dev is enabled. Direct external HTTP probing was restricted from the assistant's sandbox, so runtime connectivity still requires verification from a regular browser or Workers logs.

## Risk notes

- D1 = SQLite, **no PostgreSQL RLS**.
- SQL queries need `organization_id` and authorized membership checks.
- The current permissions model is intentionally small and must expand to module/action/record/field/approval limits.
- Billing permissions were insufficient for reading account plan details; no paid subscription was explicitly activated.
- R2, ERPNext and payment/financial processing remain unconnected.

## ERPNext accounting pilot

Open `/pilot/accounting` from the internal CRM navigation. The module lists the chart of accounts, sales and purchase invoices, payment entries, journals, and active general ledger entries. Balances and financial statements are available through the ERPNext Accounting workspace. Users enter, approve, and post transactions there under their own ERPNext accounts.

Configure these Worker settings after provisioning a separate ERPNext staging site:

| Setting | Value |
| --- | --- |
| `ERP_ORIGIN` | ERPNext HTTPS origin |
| `ERP_ORGANIZATION_ID` | ASAS D1 organization ID for the pilot |
| `ERP_COMPANY` | Exact ERPNext Company document name |
| `ERP_TOKEN` | Worker secret with the ERPNext integration user's API key and secret joined by a colon |

Use a dedicated ERPNext integration user with read access to the six DocTypes and access restricted to the linked company. The Worker checks an active owner or admin membership, sends the fixed ERPNext company filter, and rejects records returned for any other company. This configuration supports one pilot company. The ERPNext workspace uses its own session.

Before the pilot accepts real records, open each view using authorized and unauthorized staging memberships. Compare the ledger and invoices against known ERPNext transactions, including cancelled entries and currency fields.

### CRM to ERPNext

Apply migration `0003_crm_erp_links.sql` to the ASAS staging database. Give the integration user read access to Sales Order and Purchase Order in addition to the accounting DocTypes. A company owner or admin can link a CRM account using the exact number of a submitted sales order or sales invoice from the configured ERPNext company. Each customer may link to one CRM account in that company. A repeated request for the same link succeeds, and a conflicting link requires operator review. The link records the actor and timestamp. The CRM account then provides filtered views of that customer's sales orders, invoices, and payment entries.
