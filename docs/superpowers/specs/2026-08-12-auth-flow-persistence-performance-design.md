# Auth flow persistence & performance

Date: 2026-08-12
Status: approved
Approach: **A (JWT hot path + correct token persistence) + direct Postgres** (no Prisma Accelerate)

## Problem

The simulator works, but persistence and flow execution feel slow. Static tracing shows the cost is sequential remote queries on **every navigation**, not just login.

Root causes (evidence in repo):

1. `jwt` in `lib/auth.ts` always calls `getUserById` then `getAccountByUserId`. Auth.js runs this when the JWT is created **or updated**. `auth()` runs in `middleware.ts` and again in `components/providers.tsx` → **4 queries per page**.
2. Prisma is `@prisma/client/edge` + `withAccelerate()` and `prisma generate --no-engine`. Each query is an HTTP round-trip. Sequential `await`s multiply RTT.
3. Token helpers do find + delete + create (3 queries). `generateTwoFactorToken` and `generatePasswordResetToken` delete from `VerificationToken` (wrong model).
4. `login` does not verify the password before sending verification/2FA email. After a valid 2FA code it creates `TwoFactorConfirmation` and **returns without `signIn`** — the user is not authenticated.
5. `Account.userId` has no index; `getAccountByUserId` uses `findFirst({ userId })` on the JWT path.
6. Resend is `await`ed on the Server Action path.

There is no `npm test` script today. Verification for this work is TypeScript + Biome, plus a small unit suite for token + JWT helpers (added as part of implementation).

## Goals

- Protected navigations (roles, RoleGate, session) do **zero** database work in middleware and `Providers`.
- Login, 2FA, register, verify-email, forgot/reset password, and settings remain correct and become cheaper (fewer sequential writes).
- Prisma talks to Postgres over a normal TCP connection (pooled URL if the host provides one), not Accelerate HTTP.
- Middleware stays Edge-compatible (it must not import the Node Prisma engine).

## Non-goals

- Switching session strategy to database sessions.
- Introducing Redis, a job queue, or a new auth library.
- Rewriting the UI or adding new auth features.
- Changing `postinstall` migrate-on-install (separate operational issue).
- Prisma 7 / driver-adapter migration (stay on Prisma 6 `prisma-client-js`).

## Architecture

```
Browser
  │
  ├─ middleware (Edge) ── NextAuth(auth.config) ── JWT cookie only
  │                         no Prisma, no bcrypt
  │
  └─ Server Actions / Route Handlers (Node)
        NextAuth(auth.ts) ── PrismaAdapter + authorize + signIn callback
        prisma ── postgres:// (DATABASE_URL)
        mail via after() ── Resend (does not block the action result)
```

Two Auth.js entrypoints, official v5 split:

| File                 | Runtime     | Contains                                                                                                                    |
| -------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `lib/auth.config.ts` | Edge + Node | providers (ids only), pages, `session.strategy: "jwt"`, `jwt`/`session` callbacks with **no Prisma**                        |
| `lib/auth.ts`        | Node only   | `PrismaAdapter`, Credentials `authorize`, `events.linkAccount`, `signIn` callback (2FA confirmation), spreads `auth.config` |
| `middleware.ts`      | Edge        | `NextAuth(authConfig).auth(...)` — **must not import `lib/auth.ts`**                                                        |

`app/api/auth/[...nextauth]/route.ts` keeps importing `handlers` from `lib/auth.ts` (Node).

### Why the split is required

Next.js middleware runs on the Edge runtime. The Node Prisma query engine cannot load there. Accelerate + `@prisma/client/edge` was papering over that. Direct Postgres is only safe if middleware never imports Prisma.

## Persistence client

Replace `lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Changes:

- Remove `@prisma/extension-accelerate` and the `/edge` import.
- `prisma:generate` becomes `prisma generate` (engine included). Do not pass `--no-engine`.
- Env contract:
  - `DATABASE_URL` = `postgres://` (or the host’s **pooled** Postgres URL, e.g. Neon `-pooler`). **Not** `prisma://`.
  - `DIRECT_DATABASE_URL` = direct Postgres URL for migrations (already in `schema.prisma`). If there is no pooler, both may be the same `postgres://` URL.
- Keep the existing singleton on `globalThis` so Next.js dev HMR does not exhaust connections.

`PrismaAdapter(prisma)` stays in `lib/auth.ts` only.

## JWT and session (hot path)

`jwt` must **not** hit the database on ordinary session reads.

Populate claims only when:

- `user` is present (sign-in / sign-up), or
- `trigger === "update"` (settings page already calls `useSession().update()`).

On sign-in:

- Copy `name`, `email`, `role`, `isTwoFactorEnabled` from `user` when present (Credentials `authorize` returns the Prisma user).
- Set `isOauth` from `account.provider !== "credentials"` when `account` is present. Do **not** query `Account` on every request.
- If OAuth `user` lacks custom fields (`role`, `isTwoFactorEnabled`), **one** `getUserById` on that sign-in only.

On `trigger === "update"`:

- **One** `getUserById` to refresh name/email/role/2FA. Skip `Account` lookup; `isOauth` does not change in settings.

Otherwise return `token` unchanged.

`session` continues to copy token fields onto `session.user` (no DB).

Extend `types/next-auth.d.ts` JWT module with `role`, `isTwoFactorEnabled`, `isOauth` so callbacks are typed.

`getCurrentUser` / `getCurrentRole` stay as `auth()` wrappers. After this change they are cookie-only in middleware and in RSC that only need session claims.

## Token persistence

Keep Auth.js `VerificationToken` composite identity (`@@id([identifier, token])`) so `PrismaAdapter` stays compatible.

Custom models `PasswordResetToken` and `TwoFactorToken` become **one row per email**:

```prisma
model PasswordResetToken {
  identifier String   @id
  token      String
  expires    DateTime
}

model TwoFactorToken {
  identifier String   @id
  token      String
  expires    DateTime
}
```

Helpers in `lib/tokens.ts`:

- `generateVerificationToken`: `deleteMany({ identifier })` then `create` on `verificationToken` (correct table). Still 2 statements; wrap in `$transaction`.
- `generatePasswordResetToken`: `upsert` on `passwordResetToken` by `identifier`.
- `generateTwoFactorToken`: `upsert` on `twoFactorToken` by `identifier`. Lookup existing via `getTwoFactorTokenByEmail`, never `getVerificationTokenByEmail`.

Lookups by token for verify-email / reset-password: add `@@index([token])` on `VerificationToken` and `PasswordResetToken` (UUID tokens). Do **not** unique-index 2FA `token` (6-digit, collisions).

2FA confirmation replace in `login` (and the leftover delete in `signIn` callback) uses `$transaction`:

- delete existing confirmation for `userId` if any
- create new confirmation

Prefer `upsert` on `TwoFactorConfirmation` (`userId` is already `@unique`) instead of delete+create.

## Login / 2FA / credentials

`actions/login.ts` order (required):

1. Validate input.
2. `getUserByEmail`. If missing or no password, return a **generic** credentials error (do not reveal whether the email exists).
3. `bcrypt.compare` **before** any email or 2FA side effect. On mismatch, same generic error.
4. If `!emailVerified`: generate verification token, schedule email with `after()`, return success message.
5. If 2FA enabled and no `code`: generate 2FA token (correct table), schedule email, return `{ twoFactor: true }`.
6. If 2FA enabled and `code` present: validate token + expiry, delete/upsert used 2FA token, upsert confirmation, **do not return** — fall through to `signIn`.
7. `signIn("credentials", { email, password, redirectTo })` as today (redirect throw is expected).

`authorize` in `lib/auth.ts` keeps its own lookup + `bcrypt.compare`. Duplicate CPU on the success path is accepted (login is rare). Do not add a ticket/nonce cache.

`signIn` callback (Node, credentials only): keep emailVerified gate and 2FA confirmation presence check; delete confirmation after successful gate so it is single-use. That delete is login-only, not per navigation.

Login form: after 2FA confirm, `signIn` redirects. Do not treat redirect as a form error (existing `throw error` in the action already does this for the non-2FA path).

## Register, verify, reset, settings

- **Register:** `getUserByEmail` **before** `bcrypt.hash`. Then create user, upsert/create verification token, `after(sendVerificationEmail)`.
- **Verify email:** keep lookup-by-token → update user → delete token. Wrap update+delete in `$transaction`.
- **Forgot password:** generic success even if email missing (no user enumeration). If user exists, upsert reset token + `after(send)`.
- **New password:** hash, then `$transaction` of user update + delete reset token.
- **Settings:** do not `prisma.user.update({ data: { ...values } })`. Pass an explicit allowlist: `name`, `role`, `isTwoFactorEnabled`, and `password` only after hash. Never persist `newPassword`. Email change still goes through verification token + `after(send)` and does not update email until verify. Existing `update()` from `useSession` refreshes JWT via `trigger === "update"`.

## Email

`lib/mail.ts` stays the Resend wrapper.

Callers schedule with `after` from `next/server` **after** DB writes succeed:

```ts
after(() => sendTwoFactorEmail(email, token));
```

The action returns immediately. Email failure is logged inside the mail helper (do not fail the auth mutation after commit). Do not introduce a queue.

## Schema indexes

In addition to token PK changes:

```prisma
model Account {
  // existing fields...
  @@index([userId])
}

model Session {
  // existing fields...
  @@index([userId])
}
```

`User.email` and `TwoFactorConfirmation.userId` already unique.

Ship a Prisma migration (not `db push`) named for this change.

## Error handling

- Data helpers (`getUserByEmail`, token lookups) currently `catch` and return `null`, hiding real DB errors. Keep that behavior for “not found”, but **do not** swallow in write paths (`create`/`update`/`upsert`/`$transaction`). Let those throw so Server Actions can return a generic failure.
- Login/register user-facing errors stay generic for credentials; validation errors stay field-level via Zod.

## Testing

Add a real verify command (repo has no `npm test` today):

- `npx tsc --noEmit`
- `bunx biome check`
- Unit tests via `bun test` (built-in runner, no new dependency) for:
  - token generators hit the correct Prisma model (mock client)
  - `jwt` does not call user/account lookups when `trigger` is undefined and `user` is absent
  - `jwt` copies claims when `user` is present
  - login refuses 2FA/email send when password mismatches (mock)

No production DB required for these tests.

Manual checks after migrate:

1. Visit `/settings` while logged in — should not issue user/account SQL on each navigation (Prisma log or query log).
2. Login without 2FA → lands on `/settings`.
3. Login with 2FA → code email → confirm → **session exists** (this is currently broken).
4. Register → verify link → can login.
5. Forgot password → reset works; old reset rows do not pile up.
6. OAuth Google/GitHub still links and sets `emailVerified` via `linkAccount`.
7. Settings role / 2FA toggle → `update()` reflects new claims without re-login.

## File touch list

| File                               | Change                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `lib/prisma.ts`                    | Node `PrismaClient`, no Accelerate                                             |
| `lib/auth.config.ts`               | **new** — Edge-safe NextAuth config                                            |
| `lib/auth.ts`                      | Node NextAuth + adapter; jwt/session move to config; jwt no per-request DB     |
| `middleware.ts`                    | Import `auth.config`, not `lib/auth`                                           |
| `types/next-auth.d.ts`             | JWT claim types                                                                |
| `lib/tokens.ts`                    | Correct models, upsert / transaction                                           |
| `data/two-factor-token.ts`         | Lookups by `identifier` PK                                                     |
| `data/password-reset-token.ts`     | Lookups by `identifier` PK                                                     |
| `actions/login.ts`                 | Password first; 2FA fall through to `signIn`; `after(email)`                   |
| `actions/register.ts`              | Uniqueness before hash; `after(email)`                                         |
| `actions/forgot-password.ts`       | Generic response; `after(email)`                                               |
| `actions/new-password.ts`          | Transaction                                                                    |
| `actions/mail-verification.ts`     | Transaction                                                                    |
| `actions/settings.ts`              | Allowlisted update                                                             |
| `lib/mail.ts`                      | Log send failures; no API change required                                      |
| `prisma/schema.prisma`             | Token PKs, `Account`/`Session` indexes                                         |
| `prisma/migrations/*`              | New migration                                                                  |
| `package.json`                     | Drop accelerate; `prisma generate` with engine; add `test` script (`bun test`) |
| `docs/superpowers/specs/this file` | This design                                                                    |

## Rollout

1. Point `DATABASE_URL` at `postgres://` (copy from current `DIRECT_DATABASE_URL` if Accelerate was in `DATABASE_URL`). Confirm migrate still uses `directUrl`.
2. Generate client with engine, migrate, run `tsc` + biome + unit tests.
3. Smoke the manual list above.

If middleware accidentally imports `lib/auth.ts` / `lib/prisma.ts`, Edge builds fail fast — that is the guardrail.

## Decision log

- Approach A over B/C: smallest change that removes the per-request DB tax and fixes broken 2FA/token writes.
- Direct Postgres over Accelerate: Accelerate HTTP made every leftover query expensive; Node engine + pooled `postgres://` is the right fit once JWT is cookie-only on Edge.
- Keep JWT (not database sessions): database sessions would add a query on every `auth()`.
- Duplicate bcrypt on credentials `signIn`: accepted; login is rare.
- `after()` instead of a queue: YAGNI for a simulator.
