"use server";

import { after } from "next/server";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { getTwoFactorTokenByEmail } from "@/data/two-factor-token";
import { getUserByEmail } from "@/data/users";
import { sendTwoFactorEmail, sendVerificationEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import {
  generateTwoFactorToken,
  generateVerificationToken,
} from "@/lib/tokens";
import { DEFAULT_LOGIN_REDIRECT } from "@/lib/routes";
import { LoginSchema } from "@/schemas";
import { signIn } from "@/lib/auth";
import { LoginFormData } from "@/types/schemas";
import {
  INVALID_CREDENTIALS,
  assertLocalPassword,
} from "@/lib/login-credentials";

export const login = async (
  values: LoginFormData,
  callbackUrl?: string | null,
) => {
  const validatedFields = LoginSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { email, password, code } = validatedFields.data;
  const existingUser = await getUserByEmail(email);
  const passwordOk = await assertLocalPassword(
    existingUser,
    password,
    bcrypt.compare,
  );

  if (!passwordOk || !existingUser?.email) {
    return { error: INVALID_CREDENTIALS };
  }

  if (!existingUser.emailVerified) {
    const verificationToken = await generateVerificationToken(
      existingUser.email,
    );
    after(() =>
      sendVerificationEmail(existingUser.email, verificationToken.token),
    );
    return { success: "Confirmation email sent!" };
  }

  if (existingUser.isTwoFactorEnabled) {
    if (!code) {
      const twoFactorToken = await generateTwoFactorToken(existingUser.email);
      after(() => sendTwoFactorEmail(existingUser.email, twoFactorToken.token));
      return { twoFactor: true };
    }

    const twoFactorToken = await getTwoFactorTokenByEmail(existingUser.email);

    if (!twoFactorToken || twoFactorToken.token !== code) {
      return { error: "Invalid two-factor code!" };
    }

    if (new Date(twoFactorToken.expires) < new Date()) {
      return { error: "Two-factor code has expired!" };
    }

    await prisma.$transaction([
      prisma.twoFactorToken.delete({
        where: { identifier: existingUser.email },
      }),
      prisma.twoFactorConfirmation.upsert({
        where: { userId: existingUser.id },
        update: {},
        create: { userId: existingUser.id },
      }),
    ]);
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
          return { error: INVALID_CREDENTIALS };
        default:
          return { error: "Something went wrong!" };
      }
    }

    throw error;
  }
};
