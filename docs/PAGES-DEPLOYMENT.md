# GitHub Pages public preview

Repository: `ahmedwaleed07/360-Business-Suite-` (Public)

GitHub Pages was enabled on 2 November 2026, according to the repository API. The preview is deployed from `main` and `/(root)`; its expected URL is:

https://ahmedwaleed07.github.io/360-Business-Suite-/

**This site is a static demonstration only.** GitHub Pages is not the production host for a paid SaaS or sensitive business transactions.

## Commercial hosting (revised)

- Cloudflare Workers Static Assets for the React commercial frontend.
- Cloudflare Workers for application APIs and authentication/authorization.
- Cloudflare D1 for ASAS Core/CRM relational records and R2 for documents/media.
- ERPNext as separately hosted Frappe/MariaDB, integrated over secure APIs.

See [the Cloudflare architecture plan](CLOUDFLARE-ARCHITECTURE.md). There is **no Supabase dependency** in the new plan.

The current GitHub Pages preview still uses fictional in-memory data; it is not connected to a live D1 database, API, ERPNext or billing provider.
