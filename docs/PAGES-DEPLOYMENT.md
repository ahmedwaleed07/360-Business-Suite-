# GitHub Pages deployment guide

Repository: ahmedwaleed07/360-Business-Suite- (Public)

In repository Settings > Pages > Build and deployment, select "Deploy from a branch", branch "main" and folder "/ (root)" and save.

After successful Pages deployment, the expected address is:
https://ahmedwaleed07.github.io/360-Business-Suite-/

This is a guessed route based on GitHub Pages conventions, not proof that Pages has been enabled.

IMPORTANT: GitHub Pages is for static demos, not for hosting a paid SaaS application, nor sensitive transactions. The commercial system should be deployed to Cloudflare Pages and Workers (Cloudflare supports private GitHub repositories), while authentication and database access remain server-side.

Current UI is a standalone local-memory preview with fictional sample data. No real Supabase, ERPNext, billing, tenant isolation or authentication is connected.
