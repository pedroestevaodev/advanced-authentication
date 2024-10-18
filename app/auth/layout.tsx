import { auth } from "@/services/auth";
import { ChildrenProps } from "@/types/nextjs";
import { redirect } from "next/navigation";

const AuthLayout = async ({ children }: ChildrenProps) => {
    const session = await auth();

    if (!session) redirect("/auth/login");

    return (
        <div className="relative flex flex-col">
            <div className="relative flex flex-grow min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 to-blue-800">
                {children}
            </div>
        </div>
    );
};

export default AuthLayout;