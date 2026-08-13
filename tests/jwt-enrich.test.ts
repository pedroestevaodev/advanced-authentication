import { describe, expect, mock, test } from "bun:test";
import type { JWT } from "next-auth/jwt";
import { enrichJwtIfNeeded } from "@/lib/jwt-enrich";

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
