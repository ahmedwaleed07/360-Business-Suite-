# ASAS 360° Business Suite

ASAS 360°'s unified CRM + ERP + company management platform. This repository is deliberately **Public** to support a GitHub Pages product demonstration.

## Hosting decision — 2026-11-02

**Cloudflare-first; no Supabase in the new product architecture.**

- Static public preview: `index.html`, `assets/site.css`, `assets/site.js` on GitHub Pages, using fictional data only.
- Commercial frontend: Cloudflare Workers Static Assets / React.
- APIs and authorization enforcement: Cloudflare Workers (Hono planned).
- Business database: Cloudflare D1 (SQLite), with strict organization scoping in every API query. Note that **D1 does not provide PostgreSQL Row Level Security**.
- Documents and animated advertisement media: Cloudflare R2.
- Background processing: Cloudflare Queues and Cron as needed; Durable Objects for concurrency-sensitive workflows where justified.
- Login/identity: a dedicated authentication layer for Workers/D1 (Better Auth is being assessed). Cloudflare Access is an optional *internal admin* gate, not a complete customer identity and permissions system.
- ERP financial/accounting engine: separately hosted ERPNext/Frappe and MariaDB, connected only via authenticated server-to-server APIs. This is **not** a Cloudflare D1 replacement for ERPNext's own DB.

Review [Cloudflare architecture](docs/CLOUDFLARE-ARCHITECTURE.md) for scaling, security and deployment decisions.

## Public GitHub Pages demo

After Pages is enabled for `main` / `/(root)`, the expected URL is https://ahmedwaleed07.github.io/360-Business-Suite- .

The demonstration illustrates CRM, stock, approvals, roles, and an animated ads area. Up to five paid advertisements can rotate; when none are active, the ASAS 360° house advertisement is always shown. **Role switching and data isolation in the demo are not actual server-side authorization.**

The public demo must not process real customers or commercial transactions. GitHub Pages is not the production SaaS host.

## Cloudflare foundation

`cloudflare/` contains a safe, un-deployed Worker scaffold, an example Wrangler configuration and a starter D1 schema. The Worker returns a public house ad by default, and **rejects all protected API requests until authentication and authorization are implemented**.

No real D1 database, R2 bucket, Worker deployment, or ERPNext integration is claimed.

## Security

This is a publicly readable repository. Do not commit credentials, customer records, invoices, proprietary secrets, or internal business data. The existing MIRA environment must remain untouched.

Development status: prototype + architecture and scaffold; **not commercial production-ready**.
