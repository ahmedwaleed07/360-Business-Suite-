# ASAS 360° Business Suite

An integrated, modular business platform under **ASAS 360°**.

## Product scope

- Proprietary ASAS Core with tenant isolation, company administration, delegated roles and permissions.
- CRM: customers, contacts, pipelines, activities, tasks, dashboards and reports.
- ERP: planned integration with ERPNext for accounting, inventory, purchasing and operational workflows.
- ASAS Ads: up to **five paid active campaigns** rotating in the dashboard; when none are active, an animated **ASAS 360° house advertisement** must always appear.
- Unified login and module-based subscriptions, with company owners and platform administrators kept separate.

## Project stage

**Foundation / work in progress — not production-ready.**

The complete V5 backend starter, schema drafts and local tests are prepared separately for review and secure import. No production database or payment system has been connected or deployed.

## Technology direction

React + TypeScript for the dashboard, Cloudflare Workers API, Supabase Auth and PostgreSQL with RLS, and an isolated ERPNext instance/API for ERP modules.

**Security:** Do not commit credentials, .env files, service-role keys, or customer data. All tenant isolation and authorization must be enforced server-side and verified with integration tests before commercial rollout.

© ASAS 360°. Proprietary ASAS application source to be added only after repository access/visibility is verified.
