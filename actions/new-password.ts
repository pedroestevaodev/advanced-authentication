"use server";

import bcrypt from "bcryptjs";
import { getPasswordResetTokenByToken } from "@/data/password-reset-token";
import { getUserByEmail } from "@/data/users";
import { prisma } from "@/lib/prisma";
import { NewPasswordSchema } from "@/schemas";
import type { NewPasswordFormData } from "@/types/schemas";

export const newPassword = async (
  values: NewPasswordFormData,
  token?: string | null,
) => {
  if (!token) {
    return { error: "Missing token!" };
  }

  const validatedFields = NewPasswordSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { password } = validatedFields.data;

  const existingToken = await getPasswordResetTokenByToken(token);

  if (!existingToken) {
    return { error: "Invalid token!" };
  }

  const hasExpired = new Date(existingToken.expires) < new Date();

  if (hasExpired) {
    return { error: "Token has expired!" };
  }

  const existingUser = await getUserByEmail(existingToken.identifier);

  if (!existingUser) {
    return { error: "User not found!" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: existingUser.id },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.delete({
      where: { identifier: existingToken.identifier },
    }),
  ]);

  return { success: "Password updated!" };
};
