import { prisma } from "@/lib/prisma";

export const getTwoFactorTokenByToken = async (token: string) => {
  try {
    const twoFactorToken = await prisma.twoFactorToken.findFirst({
      where: { token },
    });

    return twoFactorToken;
  } catch (error) {
    return null;
  }
};

export const getTwoFactorTokenByEmail = async (email: string) => {
  try {
    const twoFactorToken = await prisma.twoFactorToken.findFirst({
      where: { identifier: email },
    });

    return twoFactorToken;
  } catch (error) {
    return null;
  }
};
