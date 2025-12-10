# E2E & Deploy Notes

## E2E (Playwright)
- Dependency: `@playwright/test` (browser download skipped on install; set `PLAYWRIGHT_BROWSERS_PATH=0` to reuse shared browsers if needed).
- Config: `playwright.config.ts` (baseURL from `E2E_BASE_URL` or `http://localhost:3000`).
- Run: `npm run e2e` (requires the Next.js dev server running separately).
- Smoke tests added: `tests/e2e/navigation.spec.ts` validates anonymous redirects for `/` and `/admin`.
- Add more flows by signing in with seeded cookies and covering stage navigation/export when auth is wired.

## Deployment Quick Hints
- Ensure `.env.local` includes `MONGODB_URI`, `JWT_SECRET`, and any LLM provider creds; redact before commit.
- If using Turbopack, keep a single lockfile in the project root to avoid root inference warnings.
- Proxy: `proxy.ts` replaces middleware; verify `matcher` covers desired routes.
- Export service requires no extra binaries (docx/pdf/pptx pure JS); keep alias for `proxy-agent` in `next.config.mjs`.
