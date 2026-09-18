# Data Model

Persistence: PostgreSQL. Repository interfaces stay independent from `pg`. Schema is applied on first connection from `src/server/persistence/schema.sql`.

```ts
type User = { id: string; email: string; passwordHash: string; passwordSet: boolean; createdAt: string; updatedAt: string };
type Session = { id: string; userId: string; tokenHash: string; expiresAt: string; createdAt: string };

type Project = {
  id: string; userId: string; name: string;
  originUrl: string; allowedHost: string;
  createdAt: string; updatedAt: string;
};

type ProjectMember = { id: string; projectId: string; userId: string; createdAt: string };
type ProjectInvite = {
  id: string; projectId: string; email: string; invitedByUserId: string;
  tokenHash: string; expiresAt: string; createdAt: string; acceptedAt?: string;
};

type Page = {
  id: string; projectId: string; sourceUrl: string;
  title?: string; snapshotId: string; createdAt: string; updatedAt: string;
  unsupportedDynamic?: string[];
};
```

Constraints:
- Unique `(userId, allowedHost)`: one project per website host for a user.
- Unique `(projectId, sourceUrl)`: recrawl of the same normalized path updates that page.
- Unique `(projectId, userId)` on members. Invited users see the project in their list and may create their own projects.
- Only `project.userId` (owner) can delete a project.
- A project is bound to one exact hostname. `www.example.com` is not `example.com`. Subdomains are rejected.
- Content IDs stay stable across recrawls when extraction produces the same mapped id.
- IndexedDB/Dexie is not used by the running app. Existing browser data is not migrated.
