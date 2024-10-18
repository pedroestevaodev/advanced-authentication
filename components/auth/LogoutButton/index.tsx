'use client';

import { logout } from "@/actions/logout";
import { ChildrenProps } from "@/types/nextjs";

const LogoutButton = ({ children }: ChildrenProps) => {
    const onClick = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    return (
        <span className="flex items-center cursor-pointer w-full" onClick={onClick}>
            {children}
        </span>
    );
};

export default LogoutButton;