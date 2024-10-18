'use server';

import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { signIn } from "@/services/auth";

export const loginProviders = async (provider: "google" | "github", callbackUrl?: string | null) => {
    try {
        await signIn(provider, {
            callbackUrl: callbackUrl || DEFAULT_LOGIN_REDIRECT,
        });
    } catch (error) {
        throw error;
    }
};