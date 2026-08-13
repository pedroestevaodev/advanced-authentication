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
