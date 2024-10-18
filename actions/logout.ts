'use server';

import { signOut } from "@/services/auth";

export const logout = async () => {
    try {
        await signOut();

        return { success: "Signed out!" };
    } catch (error) {
        return { error };
    }
};