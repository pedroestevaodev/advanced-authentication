import { auth } from "@/lib/auth";
import { ChildrenProps } from "@/types/nextjs";
import { SessionProvider } from "next-auth/react";
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
