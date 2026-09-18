# Test Plan

## Unit
Crawler validation/SSRF/redirects/timeouts/size/content type.
Extraction of headings, paragraphs, links, buttons, list items, labels, deduplication, stable IDs.
LTR/RTL/mixed bidi, numbers, URLs, punctuation, explicit dir/CSS direction.
Changes: create/update/accept/reject and original-value preservation.

## Integration
URL -> crawl -> extraction; snapshot -> content mapping; edit -> persistence -> reload; dynamic state -> state-specific content.

## E2E
Register/login -> create project with main URL -> first page crawled -> add another same-host path -> reject a different domain or subdomain -> open snapshot -> edit heading -> save -> refresh -> pending change persists.

## Auth and domain lock
Email/password sessions. Project origin is frozen from the main URL. Recrawl of the same path must not create a duplicate page.

## Fixture
Provide a local test site with LTR text, RTL text, mixed text, 3-slide carousel, tabs, accordion, modal, dropdown and show/hide content.
