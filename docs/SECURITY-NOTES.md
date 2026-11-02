# Public preview security boundary

This repository intentionally remains PUBLIC at the product owner's direction.

Public files can be copied by anyone; publishing here does not protect proprietary business logic. The public preview currently contains synthetic data and demo-only permissions. Never claim that its role selector provides access control.

PRODUCTION REQUIRES:
1. Independent ASAS Supabase project, not the existing MIRA database.
2. Authenticated backend and actual tenant-scoped authorization plus PostgreSQL RLS.
3. Separate deployment of the API on Cloudflare Workers and appropriate production UI hosting.
4. Secret storage outside GitHub source, and dedicated encryption/backup/audit procedures.
5. Independent ERPNext integration with correct licensing and data isolation.
6. Privacy review and security testing before taking customer payments or business records.

Do not use GitHub Pages for sensitive transactions or commercial SaaS hosting.
