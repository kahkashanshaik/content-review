# Architecture

## Layers
- Presentation: Next.js App Router + React UI.
- Application: use cases for crawl, extract, snapshot, edit, review and export.
- Domain: User, Session, Project, Page, PageSnapshot, PageState, ContentItem, ContentChange, Revision.
- Infrastructure: HTTP crawler, Playwright, parser/sanitizer, PostgreSQL repositories, Dexie test double, asset handling.

## Pipeline
Static: validate URL -> fetch -> validate -> parse -> extract -> normalize assets -> snapshot.
Dynamic: validate -> isolated browser -> navigate with limits -> discover supported states -> capture -> extract -> deduplicate -> snapshot.

## Auth and projects
Email/password sessions (`cr_session` HttpOnly cookie). One project is locked to one website host from the main URL. Further pages must use that exact host, including `www` when the origin used it. Recrawling a normalized path updates the existing page. Project owners can invite teammates by email; invited accounts can add, edit, submit and approve, but cannot delete the project.

## Dynamic State
Address dynamic content as `project -> page -> state -> contentItem`. Editing carousel slide 2 must not modify slide 1.

## Storage
Domain and application code must not import `pg`, Dexie, Playwright, or Next.js. API routes persist through repository interfaces backed by PostgreSQL. Memory and Dexie repositories remain test doubles.

## Rendering
Use a strong isolation boundary such as an iframe/sandbox or equivalent isolated DOM strategy. Source scripts must not execute with access to the host application.

## Errors
Use structured, actionable errors such as INVALID_URL, SSRF_BLOCKED, DOMAIN_MISMATCH, UNAUTHORIZED, FORBIDDEN, CONFLICT, NOT_FOUND, REQUEST_TIMEOUT, TOO_MANY_REDIRECTS, RESPONSE_TOO_LARGE, NOT_HTML and UNSUPPORTED_DYNAMIC_CONTENT.
