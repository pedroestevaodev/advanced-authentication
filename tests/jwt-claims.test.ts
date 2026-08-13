import { describe, expect, test } from "bun:test";
import type { JWT } from "next-auth/jwt";
import { applyJwtClaims } from "@/lib/jwt-claims";

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
