"use server";

import { signIn } from "@/lib/auth";
import { DEFAULT_LOGIN_REDIRECT } from "@/lib/routes";

export const loginProviders = async (
  provider: "google" | "github",
  callbackUrl?: string | null,
) => {
  await signIn(provider, {
    callbackUrl: callbackUrl || DEFAULT_LOGIN_REDIRECT,
  });
};
