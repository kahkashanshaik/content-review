# Cursor Agent Workflow

Read in order:
1. docs/PRD.md
2. docs/ARCHITECTURE.md
3. docs/DATA_MODEL.md
4. docs/SECURITY.md
5. docs/TEST_PLAN.md
6. docs/IMPLEMENTATION_PLAN.md
7. .cursor/rules/*

Before coding: inspect the repository and existing conventions. Do not assume the stack.
During coding: make the smallest coherent change, preserve architecture/security boundaries, add tests.
After coding: run typecheck, lint, relevant tests and production build. Verify UI in a browser.
Completion report: changed files, tests, build status, limitations and next step.
Never claim success solely because compilation passes.
