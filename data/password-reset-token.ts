import { prisma } from "@/lib/prisma";

export const getPasswordResetTokenByToken = async (token: string) => {
    try {
        const passwordResetToken = await prisma.passwordResetToken.findFirst({
            where: { token },
        });

        return passwordResetToken;
    } catch (error) {
        return null;
    }
};

export const getPasswordResetTokenByEmail = async (email: string) => {
    try {
        const passwordResetToken = await prisma.passwordResetToken.findFirst({
            where: { identifier: email },
        });

        return passwordResetToken;
    } catch (error) {
        return null;
    }
};