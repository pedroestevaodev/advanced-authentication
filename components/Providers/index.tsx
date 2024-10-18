import * as React from "react";
import { ProvidersProps } from "@/types/providers";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/services/auth";
import { Toaster } from "@/components/ui/sonner";

const Providers = async ({ children }: ProvidersProps) => {
    const session = await auth();

    return (
        <SessionProvider session={session}>
            {children}
            <Toaster />
        </SessionProvider>
    );
};

export default Providers;