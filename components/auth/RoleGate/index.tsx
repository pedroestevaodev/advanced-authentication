'use client';

import { FormError } from "@/components/FormError";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import { UserRole } from "@prisma/client";

interface RoleGateProps {
    children: React.ReactNode;
    allowedRole: UserRole;
};

const RoleGate = ({ children, allowedRole }: RoleGateProps) => {
    const role = useCurrentRole();

    if (role !== allowedRole) {
        return (
            <FormError message="You do not have permission to view this content!" />
        );
    }

    return (
        <>{children}</>
    );
};

export default RoleGate;