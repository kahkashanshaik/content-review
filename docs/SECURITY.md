# Security Requirements

Crawled websites are untrusted.

## SSRF
Block localhost, loopback, private IPv4/IPv6, link-local and cloud metadata endpoints. Resolve DNS and validate addresses before connecting. Repeat validation on redirects.

## Limits
Enforce connection/navigation timeout, total timeout, maximum response bytes, maximum redirect count and reasonable browser/resource limits.

## Snapshot
Remove scripts, event handlers, dangerous URL schemes, unsafe embeds and arbitrary form actions. Never execute source JavaScript.

## Isolation
Prevent source CSS and DOM from affecting the application. Keep browser automation in an isolated context.

## Secrets
Never expose application credentials, cookies or secrets to crawled pages.

## Regression Tests
Cover localhost/private IPs, IPv6 loopback, metadata endpoints, malicious redirects, oversized responses, XSS/event-handler payloads and unsafe links.
