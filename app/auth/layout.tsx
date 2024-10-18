import { ChildrenProps } from "@/types/nextjs";

const AuthLayout = async ({ children }: ChildrenProps) => {
    return (
        <div className="relative flex flex-col">
            <div className="relative flex flex-grow min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 to-blue-800">
                {children}
            </div>
        </div>
    );
};

export default AuthLayout;