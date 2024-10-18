'use server';

import { signOut } from "@/services/auth";

export const logout = async () => {
    try {
        await signOut();
    } catch (error) {
        return { error };
    }
};