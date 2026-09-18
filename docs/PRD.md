# Client Content Review Platform — PRD

## Goal
Build a Next.js/React platform where an agency enters a public webpage URL, safely crawls it, creates a visually faithful review snapshot, and lets a client edit supported text inline. Changes are persisted, tracked, reviewed, accepted/rejected, and exported.

## Users
- Agency/Admin: create projects, crawl pages, review changes, accept/reject, export, invite teammates.
- Client: open a shareable review URL, edit supported content inline, submit changes.
- Teammate: invited by email; can add/edit/review pages on that project and create their own projects; cannot delete an invited project.

## MVP Flow
`URL -> safe crawl -> extraction -> snapshot -> inline edit -> persistence -> review -> accept/reject -> export`

## Core Requirements
### Crawler
Server-side only. HTTP/HTTPS. SSRF protection, redirect validation, timeouts, response limits, HTML validation, structured errors.

### Extraction
Extract meaningful human-readable elements: h1-h6, p, a, button, li, label, figcaption, blockquote. Exclude scripts, styles, noscript, template, SVG path data, head metadata. Avoid duplicate nested extraction. Generate stable IDs/selectors.

### Snapshot
Preserve layout, typography, spacing, assets, links, responsiveness and directionality as safely as possible. Treat source HTML as untrusted. Sanitize and isolate it. Do not execute arbitrary third-party JS.

### Editing
Click/tap supported content to edit. Preserve original and current values. Save/cancel. Persist changes. Show edited state.

### Changes
Track project/page/content ID, original value, new value, timestamp and status. Statuses: pending, accepted, rejected.

### LTR/RTL
Support LTR, RTL and mixed-direction pages. Preserve/use `dir`, `lang`, CSS `direction`, `text-align`, `unicode-bidi`. Handle Arabic/Urdu/Persian/Hebrew, Latin text, numbers, URLs and punctuation correctly.

### Dynamic Content
Support state-aware discovery for carousels/sliders, tabs, accordions, modals, dropdowns and show/hide sections. Model content as page + state + element. Do not attempt to clone authentication-only, realtime/WebSocket, payment or complex application logic in MVP; report unsupported cases.

## Architecture
Static path: `server fetch -> parse -> extract -> snapshot`.
Dynamic path: `Playwright -> interact/discover -> capture states -> extract -> snapshot`.
Separate crawler, extraction, rendering, dynamic discovery, editor, change tracking and persistence.
Use a repository/storage abstraction. PostgreSQL is the product store; Dexie remains a test double.

## Security
Block localhost, loopback, private/link-local IPs and cloud metadata endpoints. Validate every redirect. Enforce timeouts, size and redirect limits. Sanitize HTML. Remove scripts/event handlers. Reject unsafe URL schemes. Isolate source CSS/DOM. Never expose app secrets/cookies to crawled pages. Treat user-edited content as untrusted text.

## MVP Acceptance
A user can enter a URL, crawl it, open a faithful snapshot, click a heading, edit it, save it, refresh, and see the edit persist. Agency can view pending changes and accept/reject them. LTR/RTL and common dynamic states are tested.
