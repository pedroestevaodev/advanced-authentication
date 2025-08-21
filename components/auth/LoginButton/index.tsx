'use client';

import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";

interface LoginButtonProps {
    children: React.ReactNode;
    mode?: "modal" | "redirect";
    asChild?: boolean;
};

const LoginButton = ({
    children,
    mode = "redirect",
    asChild,
}: LoginButtonProps) => {
    const router = useRouter();

    const onClick = () => {
        router.push("/auth/login");
    };

    if (mode === "modal") {
        return (
            <Dialog>
                <DialogTrigger asChild={asChild}>
                    {children}
                </DialogTrigger>
                <DialogTrigger className="p-0 w-auto bg-transparent">
                    <LoginForm />
                </DialogTrigger>
            </Dialog>
        );
    }

    return (
        <span onClick={onClick} className="cursor-pointer w-fit">
            {children}
        </span>
    );
};

export default LoginButton;
