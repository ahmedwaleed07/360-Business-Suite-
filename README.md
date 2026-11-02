# ASAS 360° Business Suite

The owner has chosen a **Public** GitHub repository, so the source and files here are publicly readable.

## Public demo (static)

A responsive **demo only** business dashboard is provided by the files in the repository root:
- index.html
- assets/site.css
- assets/site.js

This preview illustrates CRM opportunities, stock/ERP, approval workflows, user roles and animated ASAS Ads (up to 5 paid demo campaigns plus permanent ASAS house-ad fallback). Its data is fictional; changing the selected company/role does not enforce real authorization. Campaigns are not stored.

If GitHub Pages is enabled from the main branch / root folder, the demo URL is:
https://ahmedwaleed07.github.io/360-Business-Suite-/

## Commercial architecture (planned)

- Proprietary ASAS Core and CRM, modular multi-tenant subscription platform
- Supabase Auth/PostgreSQL with real RLS policies, separate from MIRA
- Cloudflare Workers for secured APIs; Cloudflare Pages or equivalent for commercial frontend
- ERPNext separately hosted and integrated through server-to-server APIs

GitHub Pages is for this **static demonstration only**; GitHub restricts its use to host commercial SaaS and sensitive transactions.

Do not commit secrets, real tenant data, access tokens or Supabase service role credentials. The locally tested V5 backend is **not yet hosted or connected**.

See docs/PAGES-DEPLOYMENT.md and docs/IMPLEMENTATION-STATUS.md.
