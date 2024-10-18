import { prisma } from "./prisma";
import crypt from "crypto";
import { v4 as uuidv4 } from 'uuid';
import { getVerificationTokenByEmail } from "@/data/verification-token";
import { getPasswordResetTokenByEmail } from "@/data/password-reset-token";

export const generatePasswordResetToken = async (email: string) => {
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + 3600 * 1000);

    const existingToken = await getPasswordResetTokenByEmail(email);

    if (existingToken) {
        await prisma.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: existingToken.identifier,
                    token: existingToken.token,
                },
            },
        });
    }

    const passwordResetToken = await prisma.passwordResetToken.create({
        data: {
            identifier: email,
            token,
            expires,
        }
    });

    return passwordResetToken;
};

export const generateVerificationToken = async (email: string) => {
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + 3600 * 1000);

    const existingToken = await getVerificationTokenByEmail(email);

    if (existingToken) {
        await prisma.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: existingToken.identifier,
                    token: existingToken.token,
                },
            },
        });
    }

    const verificationToken = await prisma.verificationToken.create({
        data: {
            identifier: email,
            token,
            expires,
        }
    });

    return verificationToken;
};

export const generateTwoFactorToken = async (email: string) => {
    const token = crypt.randomInt(100_100, 1_000_000).toString();
    const expires = new Date(new Date().getTime() + 3600 * 1000);

    const existingToken = await getVerificationTokenByEmail(email);

    if (existingToken) {
        await prisma.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: existingToken.identifier,
                    token: existingToken.token,
                },
            },
        });
    }

    const twoFactorToken = await prisma.twoFactorToken.create({
        data: {
            identifier: email,
            token,
            expires,
        }
    });

    return twoFactorToken;
};