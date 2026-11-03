# 360° Business Suite — brand + entry experience (2026-11-04)

## Approved UX for this prototype
- Brand: 360° Business Suite, white as base; purple/cyan gradients and soft gray dividers.
- The 360 + infinity mark is traced from the approved imagery. The website uses an SVG approximation of that source for crisp scaling; the approved raster source remains in the downloadable brand package.
- First visit without a saved preview session: **exactly 6,000 milliseconds** of infinity-mark intro.
- **Skip** immediately opens the entry screen (it does not bypass sign-in).
- Intro sequence: infinity mark drawn within 360 → full mark / degree symbol → product name → Powered by + official ASAS 360° logo.
- Entry screen: prominently labeled **demo** because the actual SaaS sign-in has not been built.
- Demo entry saves a local browser preview flag. Subsequent visits open the dashboard directly without replaying the intro.
- Demo logout clears the flag and starts the intro again.
- An existing verified server session should bypass intro in the eventual production implementation.
- Browser accessibility: reduced-motion preference skips intro, and all interactive controls are buttons.

## Important security distinction
The local browser preview flag is **not authentication**, grants no backend permissions and must never be used to authorize requests. It only remembers that the visitor entered the public demo. Real SaaS sessions require a vetted authentication service, HttpOnly secure cookies, session validation, revocation, MFA policy for administrators and server-enforced D1 organization authorization.

## Pages implementation
- `index.html`, `projects.html`: new brand + splash/entry markup
- `assets/brand-theme.css`: shared light UI and 6-second SVG animation
- `assets/brand-gate.js`: intro/skip/entry/logout navigation
- `assets/brand-gate-core.mjs`: testable routing and demo-session primitives
- `assets/branding/360-infinity.svg`: SVG approximation traced from selected visual
- `assets/branding/asas360-original-logo.png`: original ASAS logo from ASAS website
- `tests/brand-gate.test.mjs`: entry behavior and layout checks

This animation is implemented natively with CSS/SVG to load quickly; it is not an embedded MP4 in the public site. The 6-second MP4 file is provided in the accompanying downloadable asset pack as a separate reference.