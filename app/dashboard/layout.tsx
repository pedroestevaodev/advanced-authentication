import { auth } from "@/services/auth";
import { ChildrenProps } from "@/types/nextjs";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";

const DashboardLayout = async ({
    children,
}: ChildrenProps) => {
    const session = await auth();

    if (!session) {
        redirect("/login/sing-in");
    }

    return (
        <div className="relative flex flex-col bg-white">
            <SessionProvider session={session}>
                {children}
            </SessionProvider>
        </div>
    );
};

export default DashboardLayout;