# Auth Flow Persistence Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove per-request Prisma work from Auth.js JWT/middleware, talk to Postgres directly (no Accelerate), and make login/2FA/token persistence correct and cheaper.

**Architecture:** Split Auth.js into an Edge-safe `lib/auth.config.ts` (JWT cookie only, no Prisma imports) and a Node `lib/auth.ts` (adapter, credentials, 2FA `signIn`). Token helpers upsert the correct models. Login checks the password before side effects and falls through to `signIn` after a valid 2FA code. Email is scheduled with `after()`.

**Tech Stack:** Next.js 15.5, Auth.js 5 beta, Prisma 6.14 `prisma-client-js`, PostgreSQL, bcryptjs, Resend, Bun test runner.

**Spec:** `docs/superpowers/specs/2026-08-12-auth-flow-persistence-performance-design.md`

## Global Constraints

- Stay on Prisma 6 `prisma-client-js`. Do not migrate to Prisma 7 or driver adapters.
- Do not add Prisma Accelerate, Redis, a job queue, or a new auth library.
- Keep JWT session strategy. Do not switch to database sessions.
- Middleware must never import `lib/auth.ts`, `lib/prisma.ts`, or any `data/*` module.
- `DATABASE_URL` must be `postgres://` (or a host pooled Postgres URL). Never `prisma://`.
- `DIRECT_DATABASE_URL` remains the direct URL for migrations.
- Token field on JWT stays `isOauth`; session field stays `isOAuth` (existing mapping).
- User-facing credentials errors: `"Invalid credentials!"`. Do not reveal whether an email exists.
- No new npm dependencies. Tests use `bun:test`.
- Do not change `scripts/postinstall.mjs`.
- Before editing any existing function/class, run `gitnexus impact -r advanced-authentication --target <symbolName>` and warn on HIGH/CRITICAL. After code edits run `graphify update .`.
- After all code changes run `node .gitnexus/run.cjs analyze` if the GitNexus index is stale.

## File structure

| File                       | Responsibility                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `lib/jwt-claims.ts`        | Pure JWT claim copy (Edge-safe). No Prisma.                                                  |
| `lib/jwt-enrich.ts`        | Node-only JWT enrich on OAuth sign-in and `trigger === "update"` via injected `getUserById`. |
| `lib/login-credentials.ts` | Password check used by `login` before email/2FA.                                             |
| `lib/auth.config.ts`       | Edge NextAuth config: OAuth providers, pages, jwt/session callbacks.                         |
| `lib/auth.ts`              | Node NextAuth: adapter, Credentials, events, signIn callback, enriching jwt.                 |
| `lib/prisma.ts`            | Node `PrismaClient` singleton.                                                               |
| `lib/tokens.ts`            | Verification/reset/2FA token writes.                                                         |
| `lib/mail.ts`              | Resend wrappers; log failures, do not throw after send errors.                               |
| `middleware.ts`            | `NextAuth(authConfig)` only.                                                                 |
| `prisma/schema.prisma`     | Token PKs + `Account`/`Session` `userId` indexes.                                            |
| `tests/*.test.ts`          | Unit tests.                                                                                  |

---

### Task 1: JWT claim helper (Edge-safe) + test runner

**Files:**

- Create: `lib/jwt-claims.ts`
- Create: `tests/jwt-claims.test.ts`
- Modify: `package.json` (add `"test": "bun test"`)
- Modify: `types/next-auth.d.ts`
- Modify: `docs/superpowers/specs/2026-08-12-auth-flow-persistence-performance-design.md` (status → approved)

**Interfaces:**

- Consumes: Auth.js `JWT` type; existing session field names `role`, `isTwoFactorEnabled`, `isOAuth`
- Produces: `applyJwtClaims(params: ApplyJwtClaimsParams): JWT`

- [ ] **Step 1: Write the failing test**

Create `tests/jwt-claims.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { applyJwtClaims } from "@/lib/jwt-claims";
import type { JWT } from "next-auth/jwt";

const baseToken = { sub: "user_1" } as JWT;

describe("applyJwtClaims", () => {
  test("returns token unchanged when there is no user, account, or update session", () => {
    const result = applyJwtClaims({ token: baseToken });
    expect(result).toEqual(baseToken);
  });

  test("copies credentials user fields and sets isOauth false", () => {
    const result = applyJwtClaims({
      token: baseToken,
      user: {
        id: "user_1",
        name: "Ada",
        email: "ada@example.com",
        role: "ADMIN",
        isTwoFactorEnabled: true,
      },
      account: {
        provider: "credentials",
        type: "credentials",
        providerAccountId: "user_1",
      },
    });
    expect(result.name).toBe("Ada");
    expect(result.email).toBe("ada@example.com");
    expect(result.role).toBe("ADMIN");
    expect(result.isTwoFactorEnabled).toBe(true);
    expect(result.isOauth).toBe(false);
  });

  test("sets isOauth true for google account", () => {
    const result = applyJwtClaims({
      token: baseToken,
      user: { id: "user_1", name: "Ada", email: "ada@example.com" },
      account: { provider: "google", type: "oauth", providerAccountId: "g-1" },
    });
    expect(result.isOauth).toBe(true);
  });

  test("copies session fields on trigger update", () => {
    const result = applyJwtClaims({
      token: { ...baseToken, name: "Old" } as JWT,
      trigger: "update",
      session: {
        name: "New",
        email: "new@example.com",
        role: "USER",
        isTwoFactorEnabled: false,
      },
    });
    expect(result.name).toBe("New");
    expect(result.email).toBe("new@example.com");
    expect(result.role).toBe("USER");
    expect(result.isTwoFactorEnabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/jwt-claims.test.ts`

Expected: FAIL — `Cannot find module '@/lib/jwt-claims'` (or equivalent).

- [ ] **Step 3: Write minimal implementation**

`types/next-auth.d.ts` — keep the existing `Session` augmentation and add JWT:

```ts
import type { UserRole } from "@prisma/client";
import NextAuth, { type DefaultSession } from "next-auth";

export type ExtendedUser = DefaultSession["user"] & {
  role: UserRole;
  isTwoFactorEnabled: boolean;
  isOAuth: boolean;
};

declare module "next-auth" {
  interface Session {
    user: ExtendedUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    isTwoFactorEnabled?: boolean;
    isOauth?: boolean;
  }
}
```

`lib/jwt-claims.ts`:

```ts
import type { Account, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";

export type JwtUserFields = User & {
  role?: UserRole;
  isTwoFactorEnabled?: boolean;
};

export type JwtUpdateSession = {
  name?: string | null;
  email?: string | null;
  role?: UserRole;
  isTwoFactorEnabled?: boolean;
};

export type ApplyJwtClaimsParams = {
  token: JWT;
  user?: JwtUserFields;
  account?: Account | null;
  trigger?: "signIn" | "signUp" | "update";
  session?: JwtUpdateSession;
};

export const applyJwtClaims = ({
  token,
  user,
  account,
  trigger,
  session,
}: ApplyJwtClaimsParams): JWT => {
  if (user) {
    token.name = user.name;
    token.email = user.email;
    if (user.role) token.role = user.role;
    if (typeof user.isTwoFactorEnabled === "boolean") {
      token.isTwoFactorEnabled = user.isTwoFactorEnabled;
    }
    if (account) {
      token.isOauth = account.provider !== "credentials";
    }
  }

  if (trigger === "update" && session) {
    if (session.name !== undefined) token.name = session.name;
    if (session.email !== undefined) token.email = session.email;
    if (session.role !== undefined) token.role = session.role;
    if (typeof session.isTwoFactorEnabled === "boolean") {
      token.isTwoFactorEnabled = session.isTwoFactorEnabled;
    }
  }

  return token;
};
```

In `package.json` `scripts`, add `"test": "bun test"` next to the existing scripts. Do not remove other scripts.

Set spec status line to `Status: approved`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/jwt-claims.test.ts`

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/jwt-claims.ts tests/jwt-claims.test.ts types/next-auth.d.ts package.json docs/superpowers/specs/2026-08-12-auth-flow-persistence-performance-design.md
git commit -m "$(cat <<'EOF'
Add Edge-safe JWT claim helper and bun test runner.

EOF
)"
```

---

### Task 2: Node JWT enricher (DB only on sign-in/update)

**Files:**

- Create: `lib/jwt-enrich.ts`
- Create: `tests/jwt-enrich.test.ts`

**Interfaces:**

- Consumes: `applyJwtClaims` from `lib/jwt-claims.ts`; `getUserById(id: string)` injected
- Produces: `enrichJwtIfNeeded(params): Promise<JWT>`

- [ ] **Step 1: Write the failing test**

Create `tests/jwt-enrich.test.ts`:

```ts
import { describe, expect, mock, test } from "bun:test";
import { enrichJwtIfNeeded } from "@/lib/jwt-enrich";
import type { JWT } from "next-auth/jwt";

const token = { sub: "user_1" } as JWT;

describe("enrichJwtIfNeeded", () => {
  test("does not call getUserById on ordinary session read", async () => {
    const getUserById = mock(async () => {
      throw new Error("should not be called");
    });
    const result = await enrichJwtIfNeeded({ token, getUserById });
    expect(getUserById).not.toHaveBeenCalled();
    expect(result).toEqual(token);
  });

  test("loads user once on trigger update", async () => {
    const getUserById = mock(async () => ({
      id: "user_1",
      name: "Ada",
      email: "ada@example.com",
      role: "ADMIN" as const,
      isTwoFactorEnabled: true,
    }));
    const result = await enrichJwtIfNeeded({
      token,
      trigger: "update",
      getUserById,
    });
    expect(getUserById).toHaveBeenCalledTimes(1);
    expect(getUserById).toHaveBeenCalledWith("user_1");
    expect(result.role).toBe("ADMIN");
    expect(result.isTwoFactorEnabled).toBe(true);
  });

  test("loads user once on OAuth sign-in when role is missing", async () => {
    const getUserById = mock(async () => ({
      id: "user_1",
      name: "Ada",
      email: "ada@example.com",
      role: "USER" as const,
      isTwoFactorEnabled: false,
    }));
    const result = await enrichJwtIfNeeded({
      token,
      user: { id: "user_1", name: "Ada", email: "ada@example.com" },
      account: { provider: "google", type: "oauth", providerAccountId: "g-1" },
      getUserById,
    });
    expect(getUserById).toHaveBeenCalledTimes(1);
    expect(result.isOauth).toBe(true);
    expect(result.role).toBe("USER");
  });

  test("does not load user on credentials sign-in when role is present", async () => {
    const getUserById = mock(async () => {
      throw new Error("should not be called");
    });
    const result = await enrichJwtIfNeeded({
      token,
      user: {
        id: "user_1",
        name: "Ada",
        email: "ada@example.com",
        role: "USER",
        isTwoFactorEnabled: false,
      },
      account: {
        provider: "credentials",
        type: "credentials",
        providerAccountId: "user_1",
      },
      getUserById,
    });
    expect(getUserById).not.toHaveBeenCalled();
    expect(result.isOauth).toBe(false);
    expect(result.role).toBe("USER");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/jwt-enrich.test.ts`

Expected: FAIL — missing `@/lib/jwt-enrich`.

- [ ] **Step 3: Write minimal implementation**

`lib/jwt-enrich.ts`:

```ts
import type { Account } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";
import {
  applyJwtClaims,
  type JwtUserFields,
  type JwtUpdateSession,
} from "@/lib/jwt-claims";

export type DbUserForJwt = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  isTwoFactorEnabled: boolean;
};

export type EnrichJwtParams = {
  token: JWT;
  user?: JwtUserFields;
  account?: Account | null;
  trigger?: "signIn" | "signUp" | "update";
  session?: JwtUpdateSession;
  getUserById: (id: string) => Promise<DbUserForJwt | null>;
};

export const enrichJwtIfNeeded = async ({
  token,
  user,
  account,
  trigger,
  session,
  getUserById,
}: EnrichJwtParams): Promise<JWT> => {
  let nextUser = user;

  const needsDbUser =
    (trigger === "update" && !!token.sub) ||
    (!!user &&
      !!account &&
      account.provider !== "credentials" &&
      user.role === undefined);

  if (needsDbUser) {
    const id = (user?.id ?? token.sub) as string | undefined;
    if (id) {
      const dbUser = await getUserById(id);
      if (dbUser) {
        nextUser = {
          ...user,
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          isTwoFactorEnabled: dbUser.isTwoFactorEnabled,
        };
      }
    }
  }

  return applyJwtClaims({
    token,
    user: nextUser,
    account,
    trigger,
    session:
      trigger === "update" && nextUser
        ? {
            name: nextUser.name,
            email: nextUser.email,
            role: nextUser.role,
            isTwoFactorEnabled: nextUser.isTwoFactorEnabled,
          }
        : session,
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/jwt-enrich.test.ts tests/jwt-claims.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/jwt-enrich.ts tests/jwt-enrich.test.ts
git commit -m "$(cat <<'EOF'
Add JWT enricher that hits the database only on sign-in or update.

EOF
)"
```

---

### Task 3: Schema, data lookups, token generators

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260812120000_auth_persistence_perf/migration.sql`
- Modify: `data/two-factor-token.ts`
- Modify: `data/password-reset-token.ts`
- Modify: `lib/tokens.ts`
- Create: `tests/tokens.test.ts`

**Interfaces:**

- Consumes: `prisma` from `@/lib/prisma`
- Produces:
  - `generateVerificationToken(email: string): Promise<{ identifier: string; token: string; expires: Date }>`
  - `generatePasswordResetToken(email: string): Promise<{ identifier: string; token: string; expires: Date }>`
  - `generateTwoFactorToken(email: string): Promise<{ identifier: string; token: string; expires: Date }>`
  - `getTwoFactorTokenByEmail(email: string)` uses `findUnique({ where: { identifier } })`
  - `getPasswordResetTokenByEmail(email: string)` uses `findUnique({ where: { identifier } })`

- [ ] **Step 1: Write the failing token tests**

Create `tests/tokens.test.ts`. Mock Prisma before importing tokens:

```ts
import { beforeEach, describe, expect, mock, test } from "bun:test";

const verificationToken = {
  deleteMany: mock(async () => ({ count: 1 })),
  create: mock(async (args: { data: unknown }) => args.data),
};
const passwordResetToken = {
  upsert: mock(
    async (args: { where: { identifier: string }; create: unknown }) =>
      args.create,
  ),
};
const twoFactorToken = {
  upsert: mock(
    async (args: { where: { identifier: string }; create: unknown }) =>
      args.create,
  ),
};
const prismaMock = {
  $transaction: mock(async (fn: (tx: typeof prismaMock) => unknown) =>
    fn(prismaMock),
  ),
  verificationToken,
  passwordResetToken,
  twoFactorToken,
};

mock.module("@/lib/prisma", () => ({ prisma: prismaMock }));

const {
  generateVerificationToken,
  generatePasswordResetToken,
  generateTwoFactorToken,
} = await import("@/lib/tokens");

describe("token generators", () => {
  beforeEach(() => {
    verificationToken.deleteMany.mockClear();
    verificationToken.create.mockClear();
    passwordResetToken.upsert.mockClear();
    twoFactorToken.upsert.mockClear();
  });

  test("generateVerificationToken deletes and creates VerificationToken in a transaction", async () => {
    const result = await generateVerificationToken("ada@example.com");
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "ada@example.com" },
    });
    expect(verificationToken.create).toHaveBeenCalled();
    expect(result.identifier).toBe("ada@example.com");
    expect(result.token).toBeString();
  });

  test("generatePasswordResetToken upserts PasswordResetToken only", async () => {
    await generatePasswordResetToken("ada@example.com");
    expect(passwordResetToken.upsert).toHaveBeenCalled();
    expect(verificationToken.deleteMany).not.toHaveBeenCalled();
    const arg = passwordResetToken.upsert.mock.calls[0]?.[0] as {
      where: { identifier: string };
    };
    expect(arg.where.identifier).toBe("ada@example.com");
  });

  test("generateTwoFactorToken upserts TwoFactorToken only", async () => {
    const result = await generateTwoFactorToken("ada@example.com");
    expect(twoFactorToken.upsert).toHaveBeenCalled();
    expect(verificationToken.deleteMany).not.toHaveBeenCalled();
    expect(result.token).toMatch(/^\d{6}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/tokens.test.ts`

Expected: FAIL — current `lib/tokens.ts` still deletes `verificationToken` for reset/2FA and does not upsert.

- [ ] **Step 3: Update schema, migration, lookups, and tokens**

Replace token models and add indexes in `prisma/schema.prisma`. Keep `VerificationToken` composite `@@id([identifier, token])`. Change only these models/indexes:

```prisma
model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([provider, providerAccountId])
  @@index([userId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@id([identifier, token])
  @@index([token])
}

model PasswordResetToken {
  identifier String   @id
  token      String
  expires    DateTime

  @@index([token])
}

model TwoFactorToken {
  identifier String   @id
  token      String
  expires    DateTime
}
```

Leave `User`, `TwoFactorConfirmation`, enum, datasource, and generator unchanged.

Create `prisma/migrations/20260812120000_auth_persistence_perf/migration.sql`:

```sql
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "VerificationToken_token_idx" ON "VerificationToken"("token");

DROP TABLE IF EXISTS "PasswordResetToken";
CREATE TABLE "PasswordResetToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("identifier")
);
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

DROP TABLE IF EXISTS "TwoFactorToken";
CREATE TABLE "TwoFactorToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorToken_pkey" PRIMARY KEY ("identifier")
);
```

`data/two-factor-token.ts`:

```ts
import { prisma } from "@/lib/prisma";

export const getTwoFactorTokenByToken = async (token: string) => {
  try {
    return await prisma.twoFactorToken.findFirst({
      where: { token },
    });
  } catch {
    return null;
  }
};

export const getTwoFactorTokenByEmail = async (email: string) => {
  try {
    return await prisma.twoFactorToken.findUnique({
      where: { identifier: email },
    });
  } catch {
    return null;
  }
};
```

`data/password-reset-token.ts`:

```ts
import { prisma } from "@/lib/prisma";

export const getPasswordResetTokenByToken = async (token: string) => {
  try {
    return await prisma.passwordResetToken.findFirst({
      where: { token },
    });
  } catch {
    return null;
  }
};

export const getPasswordResetTokenByEmail = async (email: string) => {
  try {
    return await prisma.passwordResetToken.findUnique({
      where: { identifier: email },
    });
  } catch {
    return null;
  }
};
```

Replace `lib/tokens.ts` entirely:

```ts
import { randomInt } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";

const ONE_HOUR_MS = 3600 * 1000;

const expiresInOneHour = () => new Date(Date.now() + ONE_HOUR_MS);

export const generatePasswordResetToken = async (email: string) => {
  const token = uuidv4();
  const expires = expiresInOneHour();

  return prisma.passwordResetToken.upsert({
    where: { identifier: email },
    update: { token, expires },
    create: { identifier: email, token, expires },
  });
};

export const generateVerificationToken = async (email: string) => {
  const token = uuidv4();
  const expires = expiresInOneHour();

  return prisma.$transaction(async (tx) => {
    await tx.verificationToken.deleteMany({ where: { identifier: email } });
    return tx.verificationToken.create({
      data: { identifier: email, token, expires },
    });
  });
};

export const generateTwoFactorToken = async (email: string) => {
  const token = randomInt(100_000, 1_000_000).toString();
  const expires = expiresInOneHour();

  return prisma.twoFactorToken.upsert({
    where: { identifier: email },
    update: { token, expires },
    create: { identifier: email, token, expires },
  });
};
```

Use `100_000` (not `100_100`) so the code is always 6 digits.

- [ ] **Step 4: Generate client and run tests**

Run:

```bash
bunx prisma generate
bun test tests/tokens.test.ts
```

Expected: generate succeeds; token tests PASS.

If `DATABASE_URL` is still `prisma://`, `prisma generate` without `--no-engine` still works (generate does not need a live DB). `migrate` later needs `postgres://`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260812120000_auth_persistence_perf data/two-factor-token.ts data/password-reset-token.ts lib/tokens.ts tests/tokens.test.ts
git commit -m "$(cat <<'EOF'
Fix token persistence to the correct models and add lookup indexes.

EOF
)"
```

---

### Task 4: Direct Postgres client + Auth.js Edge/Node split

This task must land together. Switching off Accelerate while middleware still imports `lib/auth.ts` will break Edge.

**Files:**

- Modify: `lib/prisma.ts`
- Modify: `package.json` (`prisma:generate`, remove `@prisma/extension-accelerate`)
- Create: `lib/auth.config.ts`
- Modify: `lib/auth.ts`
- Modify: `middleware.ts`

**Interfaces:**

- Consumes: `applyJwtClaims`, `enrichJwtIfNeeded`, `getUserById`, `PrismaAdapter`, `prisma`
- Produces: `authConfig` default export; `{ handlers, signIn, signOut, auth }` from `lib/auth.ts`; middleware `auth` from `NextAuth(authConfig)`

- [ ] **Step 1: Impact analysis**

Run:

```bash
gitnexus impact -r advanced-authentication prisma
gitnexus impact -r advanced-authentication auth
```

Report blast radius in the commit message notes if HIGH/CRITICAL. Proceed: `prisma` and `auth` are expected HIGH because they are hubs. That is acceptable; this task is the coordinated cutover.

- [ ] **Step 2: Replace Prisma client and generate script**

`lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

In `package.json`:

- Change `"prisma:generate"` to `"prisma generate"` (no `--no-engine`).
- Remove `@prisma/extension-accelerate` from `dependencies`.
- Run `bun install` so the lockfile drops Accelerate.

- [ ] **Step 3: Add `lib/auth.config.ts` (no Prisma imports)**

```ts
import type { NextAuthConfig } from "next-auth";
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { applyJwtClaims } from "@/lib/jwt-claims";
import type { UserRole } from "@prisma/client";

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Github({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      return applyJwtClaims({
        token,
        user,
        account,
        trigger,
        session,
      });
    },
    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      if (session.user) {
        session.user.role = token.role as UserRole;
        session.user.isTwoFactorEnabled = Boolean(token.isTwoFactorEnabled);
        session.user.name = token.name;
        session.user.email = token.email as string;
        session.user.isOAuth = Boolean(token.isOauth);
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
```

`UserRole` from `@prisma/client` is a type-only import. Keep it `import type` so the Edge bundle does not load the Prisma engine.

- [ ] **Step 4: Rewrite `lib/auth.ts` (Node only)**

```ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { LoginSchema } from "@/schemas";
import { getUserByEmail, getUserById } from "@/data/users";
import { getTwoFactorConfirmationByUserId } from "@/data/two-factor-confirmation";
import authConfig from "@/lib/auth.config";
import { enrichJwtIfNeeded } from "@/lib/jwt-enrich";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      async authorize(credentials) {
        const validatedFields = LoginSchema.safeParse(credentials);

        if (!validatedFields.success) return null;

        const { email, password } = validatedFields.data;
        const user = await getUserByEmail(email);

        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        return user;
      },
    }),
  ],
  events: {
    async linkAccount({ user }) {
      if (!user.id) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== "credentials") return true;

      if (!user.id) throw new Error("User ID is undefined");
      const existingUser = await getUserById(user.id);

      if (!existingUser?.emailVerified) return false;

      if (existingUser.isTwoFactorEnabled) {
        const twoFactorConfirmation = await getTwoFactorConfirmationByUserId(
          existingUser.id,
        );

        if (!twoFactorConfirmation) return false;

        await prisma.twoFactorConfirmation.delete({
          where: { id: twoFactorConfirmation.id },
        });
      }

      return true;
    },
    async jwt(params) {
      return enrichJwtIfNeeded({
        token: params.token,
        user: params.user,
        account: params.account,
        trigger: params.trigger,
        session: params.session,
        getUserById,
      });
    },
  },
});
```

- [ ] **Step 5: Point middleware at auth.config**

Replace `middleware.ts`:

```ts
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/lib/auth.config";
import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
} from "@/lib/routes";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isApiAuthRoute = pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute = authRoutes.includes(pathname);

  if (isApiAuthRoute) {
    return undefined;
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(
        new URL(DEFAULT_LOGIN_REDIRECT, req.nextUrl),
      );
    }

    return undefined;
  }

  if (!isLoggedIn && !isPublicRoute) {
    let callbackUrl = pathname;

    if (req.nextUrl.search) {
      callbackUrl += req.nextUrl.search;
    }

    const encodedCallbackUrl = encodeURIComponent(callbackUrl);

    return NextResponse.redirect(
      new URL(`/auth/login?callbackUrl=${encodedCallbackUrl}`, req.nextUrl),
    );
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

Leave `app/api/auth/[...nextauth]/route.ts` importing `handlers` from `@/lib/auth`.

- [ ] **Step 6: Verify types and tests**

Run:

```bash
bunx prisma generate
bunx tsc --noEmit
bun test
```

Expected: `tsc` exit 0; existing unit tests PASS.

If `tsc` errors on `PrismaAdapter(prisma)` because of client typing, pass `prisma as any` only as last resort; prefer the unextended `PrismaClient`.

- [ ] **Step 7: graphify + commit**

Run: `graphify update .`

```bash
git add lib/prisma.ts lib/auth.config.ts lib/auth.ts middleware.ts package.json bun.lock
git commit -m "$(cat <<'EOF'
Split Auth.js for Edge middleware and use a Node Prisma client.

EOF
)"
```

---

### Task 5: Login credentials gate + 2FA fallthrough

**Files:**

- Create: `lib/login-credentials.ts`
- Create: `tests/login-credentials.test.ts`
- Modify: `actions/login.ts`
- Modify: `lib/mail.ts`

**Interfaces:**

- Consumes: `getUserByEmail`, `bcrypt.compare`, token generators, `signIn`, `after` from `next/server`
- Produces: `assertLocalPassword(user, password, compare): Promise<boolean>`; `login(...)` returns `{ error }` | `{ success }` | `{ twoFactor: true }` or redirects via `signIn`

- [ ] **Step 1: Write the failing credentials tests**

`tests/login-credentials.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  INVALID_CREDENTIALS,
  assertLocalPassword,
} from "@/lib/login-credentials";

describe("assertLocalPassword", () => {
  test("rejects missing user", async () => {
    const ok = await assertLocalPassword(null, "secret", async () => true);
    expect(ok).toBe(false);
  });

  test("rejects user without password (OAuth-only)", async () => {
    const ok = await assertLocalPassword(
      { password: null },
      "secret",
      async () => true,
    );
    expect(ok).toBe(false);
  });

  test("rejects mismatch", async () => {
    const ok = await assertLocalPassword(
      { password: "hash" },
      "wrong",
      async () => false,
    );
    expect(ok).toBe(false);
  });

  test("accepts matching password", async () => {
    const ok = await assertLocalPassword(
      { password: "hash" },
      "secret",
      async () => true,
    );
    expect(ok).toBe(true);
  });

  test("exports a generic credentials message", () => {
    expect(INVALID_CREDENTIALS).toBe("Invalid credentials!");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/login-credentials.test.ts`

Expected: FAIL — missing module.

- [ ] **Step 3: Implement helper, mail logging, and login action**

`lib/login-credentials.ts`:

```ts
export const INVALID_CREDENTIALS = "Invalid credentials!";

export type PasswordUser = {
  password: string | null;
};

export const assertLocalPassword = async (
  user: PasswordUser | null,
  password: string,
  compare: (plain: string, hash: string) => Promise<boolean>,
): Promise<boolean> => {
  if (!user?.password) return false;
  return compare(password, user.password);
};
```

`lib/mail.ts` — wrap each `resend.emails.send` in try/catch and `console.error` on failure. Do not rethrow. Example for one function; apply the same pattern to all three:

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const domain = process.env.NEXT_PUBLIC_APP_URL;

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${domain}/auth/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: "contato@pedroestevao.com",
      to: email,
      subject: "Reset your password",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });
  } catch (error) {
    console.error("Failed to send password reset email", error);
  }
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const confirmLink = `${domain}/auth/verify-email?token=${token}`;

  try {
    await resend.emails.send({
      from: "contato@pedroestevao.com",
      to: email,
      subject: "Confirm your email address",
      html: `<p>Click <a href="${confirmLink}">here</a> to confirm your email address.</p>`,
    });
  } catch (error) {
    console.error("Failed to send verification email", error);
  }
};

export const sendTwoFactorEmail = async (email: string, token: string) => {
  try {
    await resend.emails.send({
      from: "contato@pedroestevao.com",
      to: email,
      subject: "Two-factor authentication",
      html: `<p>Your 2FA code is: ${token}</p>`,
    });
  } catch (error) {
    console.error("Failed to send two-factor email", error);
  }
};
```

Replace `actions/login.ts`:

```ts
"use server";

import { after } from "next/server";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { getTwoFactorTokenByEmail } from "@/data/two-factor-token";
import { getUserByEmail } from "@/data/users";
import { sendTwoFactorEmail, sendVerificationEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import {
  generateTwoFactorToken,
  generateVerificationToken,
} from "@/lib/tokens";
import { DEFAULT_LOGIN_REDIRECT } from "@/lib/routes";
import { LoginSchema } from "@/schemas";
import { signIn } from "@/lib/auth";
import { LoginFormData } from "@/types/schemas";
import {
  INVALID_CREDENTIALS,
  assertLocalPassword,
} from "@/lib/login-credentials";

export const login = async (
  values: LoginFormData,
  callbackUrl?: string | null,
) => {
  const validatedFields = LoginSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { email, password, code } = validatedFields.data;
  const existingUser = await getUserByEmail(email);
  const passwordOk = await assertLocalPassword(
    existingUser,
    password,
    bcrypt.compare,
  );

  if (!passwordOk || !existingUser?.email) {
    return { error: INVALID_CREDENTIALS };
  }

  if (!existingUser.emailVerified) {
    const verificationToken = await generateVerificationToken(
      existingUser.email,
    );
    after(() =>
      sendVerificationEmail(existingUser.email, verificationToken.token),
    );
    return { success: "Confirmation email sent!" };
  }

  if (existingUser.isTwoFactorEnabled) {
    if (!code) {
      const twoFactorToken = await generateTwoFactorToken(existingUser.email);
      after(() => sendTwoFactorEmail(existingUser.email, twoFactorToken.token));
      return { twoFactor: true };
    }

    const twoFactorToken = await getTwoFactorTokenByEmail(existingUser.email);

    if (!twoFactorToken || twoFactorToken.token !== code) {
      return { error: "Invalid two-factor code!" };
    }

    if (new Date(twoFactorToken.expires) < new Date()) {
      return { error: "Two-factor code has expired!" };
    }

    await prisma.$transaction([
      prisma.twoFactorToken.delete({
        where: { identifier: existingUser.email },
      }),
      prisma.twoFactorConfirmation.upsert({
        where: { userId: existingUser.id },
        update: {},
        create: { userId: existingUser.id },
      }),
    ]);
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl || DEFAULT_LOGIN_REDIRECT,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: INVALID_CREDENTIALS };
        default:
          return { error: "Something went wrong!" };
      }
    }

    throw error;
  }
};
```

Do not return after a valid 2FA code. Fall through to `signIn`.

- [ ] **Step 4: Run tests**

Run: `bun test tests/login-credentials.test.ts tests/tokens.test.ts tests/jwt-claims.test.ts tests/jwt-enrich.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/login-credentials.ts tests/login-credentials.test.ts actions/login.ts lib/mail.ts
git commit -m "$(cat <<'EOF'
Check passwords before auth side effects and complete 2FA with signIn.

EOF
)"
```

---

### Task 6: Register, verify, reset, settings

**Files:**

- Modify: `actions/register.ts`
- Modify: `actions/mail-verification.ts`
- Modify: `actions/forgot-password.ts`
- Modify: `actions/new-password.ts`
- Modify: `actions/settings.ts`

**Interfaces:**

- Consumes: `generateVerificationToken`, `generatePasswordResetToken`, `after`, `prisma.$transaction`
- Produces: same exported action names and result shapes `{ error?: string; success?: string }`

- [ ] **Step 1: Rewrite register**

```ts
"use server";

import { after } from "next/server";
import { RegisterSchema } from "@/schemas";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getUserByEmail } from "@/data/users";
import { generateVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";
import { RegisterFormData } from "@/types/schemas";

export const register = async (values: RegisterFormData) => {
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { email, password, name } = validatedFields.data;
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return { error: "Email already in use!" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  const verificationToken = await generateVerificationToken(email);
  after(() => sendVerificationEmail(email, verificationToken.token));

  return { success: "Confirmation email sent!" };
};
```

- [ ] **Step 2: Rewrite verification**

```ts
"use server";

import { getUserByEmail } from "@/data/users";
import { getVerificationTokenByToken } from "@/data/verification-token";
import { prisma } from "@/lib/prisma";

export const verification = async (token: string) => {
  const existingToken = await getVerificationTokenByToken(token);

  if (!existingToken) {
    return { error: "Invalid token!" };
  }

  if (new Date(existingToken.expires) < new Date()) {
    return { error: "Token has expired!" };
  }

  const existingUser = await getUserByEmail(existingToken.identifier);

  if (!existingUser) {
    return { error: "Email not found!" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: existingUser.id },
      data: {
        emailVerified: new Date(),
        email: existingToken.identifier,
      },
    }),
    prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: existingToken.identifier,
          token: existingToken.token,
        },
      },
    }),
  ]);

  return { success: "Email verified!" };
};
```

- [ ] **Step 3: Rewrite forgot-password and new-password**

`actions/forgot-password.ts`:

```ts
"use server";

import { after } from "next/server";
import { ForgotPasswordSchema } from "@/schemas";
import { getUserByEmail } from "@/data/users";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mail";
import { ForgotPasswordFormData } from "@/types/schemas";

export const forgotPassword = async (values: ForgotPasswordFormData) => {
  const validatedFields = ForgotPasswordSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { email } = validatedFields.data;
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    const passwordResetToken = await generatePasswordResetToken(email);
    after(() =>
      sendPasswordResetEmail(
        passwordResetToken.identifier,
        passwordResetToken.token,
      ),
    );
  }

  return { success: "Email sent!" };
};
```

`actions/new-password.ts` — after hashing, replace the two sequential writes with:

```ts
await prisma.$transaction([
  prisma.user.update({
    where: { id: existingUser.id },
    data: { password: hashedPassword },
  }),
  prisma.passwordResetToken.delete({
    where: { identifier: existingToken.identifier },
  }),
]);
```

Keep the rest of the file (token missing/expired/user missing checks) as it is today, including imports and `NewPasswordSchema`.

- [ ] **Step 4: Rewrite settings allowlist**

Replace the final `prisma.user.update` in `actions/settings.ts`. Keep OAuth stripping and email-change branch. For email change, use `after(() => sendVerificationEmail(...))` instead of `await sendVerificationEmail`.

Allowlisted update:

```ts
const data: {
  name?: string;
  role?: SettingsFormData["role"];
  isTwoFactorEnabled?: boolean;
  password?: string;
} = {};

if (values.name !== undefined) data.name = values.name;
if (values.role !== undefined) data.role = values.role;
if (typeof values.isTwoFactorEnabled === "boolean") {
  data.isTwoFactorEnabled = values.isTwoFactorEnabled;
}
if (values.password && values.newPassword && dbUser.password) {
  const passwordMatch = await bcrypt.compare(values.password, dbUser.password);

  if (!passwordMatch) {
    return { error: "Invalid password" };
  }

  data.password = await bcrypt.hash(values.newPassword, 10);
}

await prisma.user.update({
  where: { id: dbUser.id },
  data,
});

return { success: "Settings updated!" };
```

Remove the old `data: { ...values }` update. Do not write `newPassword` or `email` in this update.

- [ ] **Step 5: Typecheck and tests**

Run:

```bash
bunx tsc --noEmit
bunx biome check --write actions lib data tests middleware.ts types/next-auth.d.ts
bun test
```

Expected: tsc 0, biome clean, tests PASS.

- [ ] **Step 6: graphify + GitNexus + commit**

Run:

```bash
graphify update .
node .gitnexus/run.cjs analyze
```

```bash
git add actions/register.ts actions/mail-verification.ts actions/forgot-password.ts actions/new-password.ts actions/settings.ts
git commit -m "$(cat <<'EOF'
Tighten remaining auth actions with transactions, allowlists, and deferred mail.

EOF
)"
```

---

### Task 7: Apply migration and verify

**Files:**

- None new. Env is local to the operator.

**Interfaces:**

- Consumes: migration from Task 3
- Produces: applied DB schema; `bun test` + `tsc` green

- [ ] **Step 1: Point DATABASE_URL at Postgres**

If `DATABASE_URL` starts with `prisma://`, set it to the current `DIRECT_DATABASE_URL` value (or the host pooled `postgres://` URL). Keep `DIRECT_DATABASE_URL` as the direct URL. Do not print secrets into logs or commits.

- [ ] **Step 2: Apply migration**

Run: `bunx prisma migrate dev --name auth_persistence_perf`

If the migration folder from Task 3 already exists, Prisma may only apply it. Do not create a second duplicate migration. If Prisma wants a new name because the folder already exists, use `bunx prisma migrate deploy` instead.

Expected: migration applied, client generated.

- [ ] **Step 3: Full verify**

Run:

```bash
bunx tsc --noEmit
bunx biome check
bun test
```

Expected: all exit 0.

Manual smoke (operator):

1. Logged-in `/settings` navigation does not query `User`/`Account` on each load.
2. Login without 2FA reaches `/settings`.
3. Login with 2FA: submit code → **session exists** (redirect), not a success toast with no cookie.
4. Register → verify email → login.
5. Forgot password → reset; no extra `PasswordResetToken` rows per email.
6. Google/GitHub still link; `linkAccount` sets `emailVerified`.
7. Settings role/2FA toggle + `update()` shows new claims.

- [ ] **Step 4: Commit only if migrate created extra files**

```bash
git add prisma/migrations
git commit -m "$(cat <<'EOF'
Record applied auth persistence Prisma migration.

EOF
)"
```

Skip this commit if there is nothing new.

---

## Spec coverage self-review

| Spec requirement                                                | Task                          |
| --------------------------------------------------------------- | ----------------------------- |
| JWT no DB on ordinary reads                                     | 1, 2, 4                       |
| Edge/Node Auth.js split; middleware no Prisma                   | 4                             |
| Direct Postgres client; drop Accelerate / `--no-engine`         | 4                             |
| Token upsert / correct tables; VerificationToken composite kept | 3                             |
| Account/Session/token indexes + migration                       | 3, 7                          |
| Password before 2FA/email; generic credentials error            | 5                             |
| 2FA confirm falls through to `signIn`                           | 5                             |
| Confirmation upsert in transaction                              | 5                             |
| `after()` email; mail errors logged                             | 5, 6                          |
| Register uniqueness before hash                                 | 6                             |
| Verify/reset transactions                                       | 6                             |
| Settings allowlist; no `newPassword` persist                    | 6                             |
| `bun test` + tsc + biome                                        | 1, 7                          |
| OAuth `linkAccount` emailVerified                               | 4                             |
| `session.update` refreshes claims                               | 2, 4 (`trigger === "update"`) |

## Placeholder scan

Removed duplicate SQL. Token tests mock `@/lib/prisma`. No TBD.

## Type consistency

- JWT token flag: `isOauth`
- Session user flag: `isOAuth`
- `applyJwtClaims` / `enrichJwtIfNeeded` share `JwtUserFields` and `JwtUpdateSession`
- Password reset / 2FA delete by `{ identifier }` after PK change
- `INVALID_CREDENTIALS` is `"Invalid credentials!"`
