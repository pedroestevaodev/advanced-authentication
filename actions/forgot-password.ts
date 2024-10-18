'use server';

import * as z from "zod";
import { ForgotPasswordSchema } from "@/schemas";
import { getUserByEmail } from "@/data/users";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mail";

export const forgotPassword = async (values: z.infer<typeof ForgotPasswordSchema>) => {
    const validatedFields = ForgotPasswordSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    const { email } = validatedFields.data;

    const existingUser = await getUserByEmail(email);

    if (!existingUser) {
        return { error: "Email not found!" };
    }

    const passwordResetToken = await generatePasswordResetToken(email);

    await sendPasswordResetEmail(passwordResetToken.identifier, passwordResetToken.token);

    return { success: "Email sent!" };
};