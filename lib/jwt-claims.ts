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
