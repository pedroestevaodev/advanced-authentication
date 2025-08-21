"use server";

import { DEFAULT_LOGIN_REDIRECT } from "@/lib/routes";
import { signIn } from "@/lib/auth";

export const loginProviders = async (
  provider: "google" | "github",
  callbackUrl?: string | null
) => {
  try {
    await signIn(provider, {
      callbackUrl: callbackUrl || DEFAULT_LOGIN_REDIRECT,
    });
  } catch (error) {
    throw error;
  }
};
