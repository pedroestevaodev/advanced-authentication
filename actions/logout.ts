'use server';

import { signOut } from "@/services/auth";
import { NextResponse } from "next/server";

export const logout = async () => {
    try {
        await signOut();

        return NextResponse.redirect(new URL('/auth/login'));
    } catch (error) {
        return { error };
    }
};