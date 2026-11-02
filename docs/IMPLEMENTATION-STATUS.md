# ASAS Business Suite establishment and migration status

GitHub repository: `ahmedwaleed07/360-Business-Suite-` (Public; intended for demonstration).
GitHub Pages feature was enabled and previously verified through GitHub repository API. The actual site response was not independently verified.
Public preview files: index.html and assets/site.js/site.css (fictional data only).
GitHub Actions static-demo tests had previously completed successfully.

## Architecture revision — 2 November 2026
- [x] Decision: replace **Supabase** with **Cloudflare-first** for ASAS Core/CRM.
- [x] Architecture documentation updated to Cloudflare Workers + D1 + R2.
- [x] Add safe D1 schema and Workers scaffold **without deploying it**.
- [ ] Create dedicated ASAS D1 database (new Cloudflare resource; check account/billing first).
- [ ] Implement and test real authentication on Workers/D1.
- [ ] Enforce tenant-level permissions and record-level security on all endpoints.
- [ ] Deploy staging Worker, connect D1 and run integration tests.
- [ ] Configure R2 for confidential documents and approved advertising creatives.
- [ ] ERPNext deployment and secured integration (separate MariaDB and hosting).
- [ ] Commercial subscriptions and production audit/monitoring.

The earlier V5 Supabase implementation is **deprecated by this decision** and not to be connected to MIRA or deployed for this project.

No live commercial backend has been set up or deployed yet.
