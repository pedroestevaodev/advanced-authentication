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
