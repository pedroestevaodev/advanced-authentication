'use server';

import { getUserByEmail } from "@/data/users";
import { getVerificationTokenByToken } from "@/data/verification-token";
import { prisma } from "@/lib/prisma";

export const verification = async (token: string) => {
    const existingToken = await getVerificationTokenByToken(token);

    if (!existingToken) {
        return { error: "Invalid token!" };
    }

    const hasExpired = new Date(existingToken.expires) < new Date();

    if (hasExpired) {
        return { error: "Token has expired!" };
    }

    const existingUser = await getUserByEmail(existingToken.identifier);

    if (!existingUser) {
        return { error: "Email not found!" };
    }

    await prisma.user.update({
        where: { id: existingUser.id },
        data: { 
            emailVerified: new Date(), 
            email: existingToken.identifier,
        },
    });

    await prisma.verificationToken.delete({
        where: { 
            identifier_token: {
                identifier: existingToken.identifier,
                token: existingToken.token,
            },
        },
    });

    return { success: "Email verified!" };
};