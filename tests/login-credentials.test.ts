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
