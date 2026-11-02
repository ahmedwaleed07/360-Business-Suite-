# ASAS 360° Business Suite

Unified CRM, ERP and operational platform by **ASAS 360°**. This repository intentionally remains **Public** for the GitHub Pages demonstration.

## Current status — 2 November 2026

**Cloudflare-first. No Supabase dependency for ASAS Business Suite.**

- **Public GitHub Pages UI:** CRM, stock, permissions and workflows remain fictional demos. Public advertising inventory is fetched read-only from the Cloudflare staging API when available; the animated ASAS house advertisement always remains as fallback.
- **Cloudflare D1:** A separate staging database named \`asas-business-suite-staging\` was created and the initial schema applied. Existing MIRA, MAIC and GO Barbie resources were not modified. Tenant composite foreign-key integrity and the maximum-five-active-paid-ads trigger were tested with temporary data, then cleaned up.
- **Cloudflare Worker:** \`asas-business-suite-staging\` was deployed with a D1 binding and an origin allowlist for the read-only ad endpoint. It serves \`/health\` and \`/public/ads\`, while protected CRM routes **fail closed** until Cloudflare Access is configured.
- **API code:** Verifies RS256 Cloudflare Access JWT signatures and issuer/audience/expiry, then checks organizational memberships in D1 before a CRM list or create request. Authorized creations are audit logged. The customer-login and company onboarding product is *not* implemented.
- **GitHub Actions:** native Node test suite validates Cloudflare Access token security, tenant-scoping and static demo. This does not substitute for an end-to-end production security review.

### Links

- [Public UI preview](https://ahmedwaleed07.github.io/360-Business-Suite-/)
- [Worker staging health route](https://asas-business-suite-staging.eng-ahmed-waleed.workers.dev/health)
- [Worker public advertisements](https://asas-business-suite-staging.eng-ahmed-waleed.workers.dev/public/ads)

Cloudflare API confirms Worker deployment and subdomain enablement. Direct HTTP reachability from the assistant's environment could **not** be independently verified.

## Technical architecture

| Layer | Selected system |
|---|---|
| Demo UI | GitHub Pages (static, synthetic data) |
| Commercial frontend | React/TypeScript → Cloudflare Workers Static Assets |
| API | Cloudflare Workers (Hono planned) |
| ASAS Core / CRM | Cloudflare D1 (SQLite), server-enforced tenant/role scoping |
| Uploaded media/files | Cloudflare R2 (planned, not created) |
| Messages/jobs | Cloudflare Queues (planned) |
| Pilot internal identity gate | Cloudflare Access JWT verification (requires policy configuration) |
| Commercial customer login | Dedicated SaaS auth stack, not implemented yet |
| ERP accounting | Separately hosted ERPNext/Frappe + MariaDB (not connected) |

**Security:** D1 does not have PostgreSQL RLS. Membership checks and organization filters MUST be enforced in every API query. The public demo's role selector is cosmetic only. Do not put secret keys, actual customer data, payroll records or private documents in this Public repository.

**Product readiness:** staging foundation — **not a commercial SaaS launch**. No subscribers, invoices, payments or production admin accounts were created.

See [implementation status](docs/IMPLEMENTATION-STATUS.md), [Cloudflare architecture](docs/CLOUDFLARE-ARCHITECTURE.md) and [security notes](docs/SECURITY-NOTES.md).
