'use server';

import { signOut } from "@/services/auth";
import { redirect } from "next/navigation";

export const logout = async () => {
    try {
        await signOut();

        redirect("/auth/login");
    } catch (error) {
        return { error };
    }
};