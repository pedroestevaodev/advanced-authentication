import { Providers } from "@/components/providers";
import { fontSans } from "@/config/fonts";
import { cn } from "@/helpers/auxiliary-helpers";
import "@/styles/globals.css";
import type { Metadata } from "next";
import type { ChildrenProps } from "@/types/nextjs";

export const metadata: Metadata = {
  title: "Advanced Authentication",
  description:
    "Authentication simulator with Next.js and Auth.js: credentials, OAuth, 2FA, and role-based access.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

const RootLayout = ({ children }: Readonly<ChildrenProps>) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-[#fafafa] antialiased",
          fontSans.className,
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
