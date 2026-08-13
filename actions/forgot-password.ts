"use server";

import { after } from "next/server";
import { getUserByEmail } from "@/data/users";
import { sendPasswordResetEmail } from "@/lib/mail";
import { generatePasswordResetToken } from "@/lib/tokens";
import { ForgotPasswordSchema } from "@/schemas";
import type { ForgotPasswordFormData } from "@/types/schemas";

export const forgotPassword = async (values: ForgotPasswordFormData) => {
  const validatedFields = ForgotPasswordSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { email } = validatedFields.data;
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    const passwordResetToken = await generatePasswordResetToken(email);
    after(() =>
      sendPasswordResetEmail(
        passwordResetToken.identifier,
        passwordResetToken.token,
      ),
    );
  }

  return { success: "Email sent!" };
};
