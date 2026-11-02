# Public repository security policy

The owner has explicitly chosen to keep this repository **Public** for the GitHub Pages preview. Its source can be viewed/copied by anyone. Do not publish company secrets, client records, credentials, financial data, private business logic, or production configuration.

## Revised stack (Cloudflare only for ASAS core)
- Browser → Cloudflare Workers API → Cloudflare D1 (SQLite).
- Files/media in private R2 buckets via authenticated delivery.
- ERPNext is separately hosted (Frappe / MariaDB), connected via secured API only.
- No Supabase resources or credentials to be used.

## Crucial authorization distinction

D1 does **not** have PostgreSQL RLS. Every API operation must validate the authenticated user, check membership / grants, and enforce tenant and branch constraints. Cross-tenant authorization must be tested before production. A "company" select box or a hidden button in the static demo is NOT real isolation.

Cloudflare Access can protect internal administrative tools but is not a complete end-customer SaaS auth system. Use a vetted production authentication solution with robust session security and MFA, and keep API keys and ERPNext credentials in Cloudflare-managed secrets.

The Cloudflare Worker scaffold deliberately serves only public health/advertising endpoints and denies all protected endpoints until session and authorization functionality is implemented.

Never use GitHub Pages to accept payments or store real company information.
