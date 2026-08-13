import { randomInt } from "node:crypto";
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
