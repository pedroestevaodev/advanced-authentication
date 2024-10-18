'use client';

import { logout } from "@/actions/logout";
import { ChildrenProps } from "@/types/nextjs";

const LogoutButton = ({ children }: ChildrenProps) => {
    const onClick = () => {
        logout();
    };

    return (
        <span className="cursor-pointer" onClick={logout}>
            {children}
        </span>
    );
};

export default LogoutButton;