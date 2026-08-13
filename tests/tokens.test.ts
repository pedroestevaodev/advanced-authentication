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
