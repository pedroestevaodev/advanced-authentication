'use server';

import { getTwoFactorConfirmationByUserId } from "@/data/two-factor-confirmation";
import { getTwoFactorTokenByEmail } from "@/data/two-factor-token";
import { getUserByEmail } from "@/data/users";
import { sendTwoFactorEmail, sendVerificationEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { generateTwoFactorToken, generateVerificationToken } from "@/lib/tokens";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { LoginSchema } from "@/schemas";
import { signIn } from "@/services/auth";
import { AuthError } from "next-auth";
import * as z from "zod";

export const login = async (values: z.infer<typeof LoginSchema>, callbackUrl?: string | null) => {
    const validatedFields = LoginSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    const { email, password, code } = validatedFields.data;

    const existingUser = await getUserByEmail(email);

    if (!existingUser || !existingUser.email || !existingUser.password) {
        return { error: "Email does not exists!" };
    }

    if (!existingUser.emailVerified) {
        const verificationToken = await generateVerificationToken(existingUser.email);

        await sendVerificationEmail(existingUser.email, verificationToken.token);

        return { success: "Confirmation email sent!" };
    }

    if (existingUser.isTwoFactorEnabled && existingUser.email) {
        if (code) {
            const twoFactorToken = await getTwoFactorTokenByEmail(existingUser.email);

            if (!twoFactorToken || twoFactorToken.token !== code) {
                return { error: "Invalid two-factor code!" };
            }

            const hasExpired = new Date(twoFactorToken.expires) < new Date();

            if (hasExpired) {
                return { error: "Two-factor code has expired!" };
            }

            await prisma.twoFactorToken.delete({
                where: {
                    identifier_token: {
                        identifier: existingUser.email,
                        token: twoFactorToken.token,
                    },
                },
            });

            const existingConfirmation = await getTwoFactorConfirmationByUserId(existingUser.id);

            if (existingConfirmation) {
                await prisma.twoFactorConfirmation.delete({
                    where: {
                        id: existingConfirmation.id,
                    },
                });
            }

            await prisma.twoFactorConfirmation.create({
                data: {
                    userId: existingUser.id,
                },
            });

            // return { success: "Two-factor authentication successful!" };
        } else {
            const twoFactorToken = await generateTwoFactorToken(existingUser.email);
    
            await sendTwoFactorEmail(existingUser.email, twoFactorToken.token);
    
            return { twoFactor: true };
            // return { success: "Two-factor authentication code sent!" };
        }
    }

    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo: callbackUrl || DEFAULT_LOGIN_REDIRECT,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Invalid credentials!" };
                default:
                    return { error: "Something went wrong!" };
            }
        }

        throw error;
    }
};