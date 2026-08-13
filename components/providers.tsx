import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import type { ChildrenProps } from "@/types/nextjs";
import { Toaster } from "./ui/sonner";

const Providers = async ({ children }: ChildrenProps) => {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      {children}
      <Toaster />
    </SessionProvider>
  );
};

export { Providers };
