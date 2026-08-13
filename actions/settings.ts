"use server";

import bcrypt from "bcryptjs";
import { after } from "next/server";
import { getCurrentUser } from "@/data/account";
import { getUserByEmail, getUserById } from "@/data/users";
import { sendVerificationEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { generateVerificationToken } from "@/lib/tokens";
import type { SettingsFormData } from "@/types/schemas";

export const settings = async (values: SettingsFormData) => {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  if (!user.id) {
    return { error: "User ID is undefined" };
  }

  const dbUser = await getUserById(user.id);

  if (!dbUser) {
    return { error: "Unauthorized" };
  }

  if (user.isOAuth) {
    values.email = undefined;
    values.password = undefined;
    values.newPassword = undefined;
    values.isTwoFactorEnabled = undefined;
  }

  if (values.email && values.email !== user.email) {
    const existingUser = await getUserByEmail(values.email);

    if (existingUser && existingUser.id !== user.id) {
      return { error: "Email already exists" };
    }

    const verificationToken = await generateVerificationToken(values.email);

    after(() =>
      sendVerificationEmail(
        verificationToken.identifier,
        verificationToken.token,
      ),
    );

    return { success: "Verification email sent!" };
  }

  const data: {
    name?: string;
    role?: SettingsFormData["role"];
    isTwoFactorEnabled?: boolean;
    password?: string;
  } = {};

  if (values.name !== undefined) data.name = values.name;
  if (values.role !== undefined) data.role = values.role;
  if (typeof values.isTwoFactorEnabled === "boolean") {
    data.isTwoFactorEnabled = values.isTwoFactorEnabled;
  }
  if (values.password && values.newPassword && dbUser.password) {
    const passwordMatch = await bcrypt.compare(
      values.password,
      dbUser.password,
    );

    if (!passwordMatch) {
      return { error: "Invalid password" };
    }

    data.password = await bcrypt.hash(values.newPassword, 10);
  }

  await prisma.user.update({
    where: { id: dbUser.id },
    data,
  });

  return { success: "Settings updated!" };
};
