# Implementation Plan

0. Inspect repo and confirm stack.
1. Foundation: routes, types, errors, tests.
2. Storage: PostgreSQL + repository interfaces; Dexie kept as a test double.
3. Auth: email/password, HttpOnly sessions, project-scoped pages.
4. Crawler: URL validation, SSRF, redirects, limits.
5. Extraction: semantic content, stable IDs, direction/language.
6. Snapshot: sanitization, assets, isolation, content mapping.
7. Inline editing: edit/save/cancel/persistence.
8. LTR/RTL/mixed direction.
9. Dynamic discovery with Playwright and PageState.
10. Client review, revisions, accept/reject.
11. Agency dashboard and export.
12. Security/performance/accessibility hardening.
13. E2E and production verification.

Definition of done: implementation + relevant tests + typecheck + lint + production build + browser verification for UI + updated docs.
