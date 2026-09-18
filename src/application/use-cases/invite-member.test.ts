import assert from "node:assert/strict";
import { test } from "node:test";

import type { MailMessage } from "../ports/mailer.ts";
import { createMemoryUsers } from "../../persistence/memory/create-auth.ts";
import { createMemoryRepositories } from "../../persistence/memory/create-repositories.ts";
import { saveTestProject, TEST_USER_ID } from "../../persistence/memory/test-project.ts";
import { acceptInvite, lookupInvite } from "./accept-invite.ts";
import { deleteProject } from "./delete-project.ts";
import { inviteMember } from "./invite-member.ts";
import { listAccessibleProjects, resolveProjectAccess } from "./project-access.ts";
import type { User } from "../../domain/types.ts";

test("inviteMember creates an account, membership, and email link", async () => {
  const { repos, users, mail } = await setup();
  const project = await saveTestProject(repos);
  const result = await inviteMember(
    {
      projectId: project.id,
      email: "dev@example.com",
      invitedByUserId: TEST_USER_ID,
      appOrigin: "http://localhost:3028",
    },
    repos,
    users,
    mail,
    () => new Date("2026-09-09T00:00:00.000Z"),
    async (password) => `hash:${password}`,
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.createdAccount, true);
  assert.equal(result.value.emailSent, true);
  assert.match(result.value.inviteUrl, /^http:\/\/localhost:3028\/invite\/[0-9a-f]+$/);
  assert.equal(mail.messages.length, 1);
  assert.equal(mail.messages[0]?.to, "dev@example.com");
  assert.match(mail.messages[0]?.text ?? "", /cannot delete this project/i);

  const invited = await users.getByEmail("dev@example.com");
  assert.equal(invited?.passwordSet, false);
  const listed = await listAccessibleProjects(invited?.id ?? "", repos);
  assert.equal(listed.some((entry) => entry.id === project.id), true);
});

test("invited members can work on a project but cannot delete it", async () => {
  const { repos, users, mail } = await setup();
  const project = await saveTestProject(repos);
  const invited = await inviteMember(
    {
      projectId: project.id,
      email: "dev@example.com",
      invitedByUserId: TEST_USER_ID,
      appOrigin: "http://localhost:3028",
    },
    repos,
    users,
    mail,
    () => new Date("2026-09-09T00:00:00.000Z"),
    async (password) => `hash:${password}`,
  );
  assert.equal(invited.ok, true);
  if (!invited.ok) {
    return;
  }

  const user = await users.getByEmail("dev@example.com");
  assert.ok(user);
  const access = await resolveProjectAccess(user.id, project.id, repos);
  assert.equal(access.ok, true);
  if (access.ok) {
    assert.equal(access.value.role, "member");
  }

  const deletedByMember = await deleteProject(user.id, project.id, repos);
  assert.equal(deletedByMember.ok, false);
  if (!deletedByMember.ok) {
    assert.equal(deletedByMember.error.code, "FORBIDDEN");
  }

  const deletedByOwner = await deleteProject(TEST_USER_ID, project.id, repos);
  assert.equal(deletedByOwner.ok, true);
  assert.equal(await repos.projects.getById(project.id), undefined);
});

test("acceptInvite lets a new teammate set a password", async () => {
  const { repos, users, mail } = await setup();
  const project = await saveTestProject(repos);
  const invited = await inviteMember(
    {
      projectId: project.id,
      email: "dev@example.com",
      invitedByUserId: TEST_USER_ID,
      appOrigin: "http://localhost:3028",
    },
    repos,
    users,
    mail,
    () => new Date("2026-09-09T00:00:00.000Z"),
    async (password) => `hash:${password}`,
  );
  assert.equal(invited.ok, true);
  if (!invited.ok) {
    return;
  }

  const token = invited.value.inviteUrl.split("/invite/")[1] ?? "";
  const preview = await lookupInvite({ token }, repos, users, () => new Date("2026-09-09T01:00:00.000Z"));
  assert.equal(preview.ok, true);
  if (preview.ok) {
    assert.equal(preview.value.requiresPassword, true);
    assert.equal(preview.value.projectName, "Launch");
  }

  const accepted = await acceptInvite(
    { token, password: "password123" },
    repos,
    users,
    async (user, password) => {
      const next: User = {
        ...user,
        passwordHash: `hash:${password}`,
        passwordSet: true,
        updatedAt: "2026-09-09T01:00:00.000Z",
      };
      await users.save(next);
      return { ok: true, value: next };
    },
    () => new Date("2026-09-09T01:00:00.000Z"),
  );
  assert.equal(accepted.ok, true);
  if (!accepted.ok) {
    return;
  }

  assert.equal(accepted.value.user.passwordSet, true);
  assert.equal(accepted.value.project.id, project.id);
});

test("inviteMember still succeeds when the mailer fails", async () => {
  const repos = createMemoryRepositories();
  const users = createMemoryUsers();
  await users.save({
    id: TEST_USER_ID,
    email: "owner@example.com",
    passwordHash: "hash:secret",
    passwordSet: true,
    createdAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
  });
  const project = await saveTestProject(repos);
  const result = await inviteMember(
    {
      projectId: project.id,
      email: "dev@example.com",
      invitedByUserId: TEST_USER_ID,
      appOrigin: "http://localhost:3028",
    },
    repos,
    users,
    {
      async send() {
        throw new Error("SMTP down");
      },
    },
    () => new Date("2026-09-09T00:00:00.000Z"),
    async (password) => `hash:${password}`,
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.emailSent, false);
  assert.equal(result.value.emailError, "SMTP down");
  assert.ok(await users.getByEmail("dev@example.com"));
});

test("inviteMember resends mail for someone already on the project", async () => {
  const { repos, users, mail } = await setup();
  const project = await saveTestProject(repos);
  const first = await inviteMember(
    {
      projectId: project.id,
      email: "dev@example.com",
      invitedByUserId: TEST_USER_ID,
      appOrigin: "http://localhost:3028",
    },
    repos,
    users,
    mail,
    () => new Date("2026-09-09T00:00:00.000Z"),
    async (password) => `hash:${password}`,
  );
  assert.equal(first.ok, true);

  const second = await inviteMember(
    {
      projectId: project.id,
      email: "dev@example.com",
      invitedByUserId: TEST_USER_ID,
      appOrigin: "http://localhost:3028",
    },
    repos,
    users,
    mail,
    () => new Date("2026-09-09T01:00:00.000Z"),
    async (password) => `hash:${password}`,
  );

  assert.equal(second.ok, true);
  if (!second.ok) {
    return;
  }

  assert.equal(second.value.createdAccount, false);
  assert.equal(second.value.emailSent, true);
  assert.equal(mail.messages.length, 2);
  const members = await repos.members.listByProject(project.id);
  assert.equal(members.length, 1);
});

async function setup(): Promise<{
  repos: ReturnType<typeof createMemoryRepositories>;
  users: ReturnType<typeof createMemoryUsers>;
  mail: { messages: MailMessage[]; send(message: MailMessage): Promise<void> };
}> {
  const repos = createMemoryRepositories();
  const users = createMemoryUsers();
  await users.save({
    id: TEST_USER_ID,
    email: "owner@example.com",
    passwordHash: "hash:secret",
    passwordSet: true,
    createdAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
  });
  const messages: MailMessage[] = [];
  return {
    repos,
    users,
    mail: {
      messages,
      async send(message) {
        messages.push(message);
      },
    },
  };
}
