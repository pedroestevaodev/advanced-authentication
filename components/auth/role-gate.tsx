"use client";

import { useCurrentRole } from "@/hooks/useCurrentRole";
import { RoleGateProps } from "@/types/components";
import { FormError } from "../forms/form-error";

const RoleGate = ({ children, allowedRole }: RoleGateProps) => {
  const role = useCurrentRole();

  if (role !== allowedRole) {
    return (
      <FormError message="You do not have permission to view this content!" />
    );
  }

  return <>{children}</>;
};

export { RoleGate };
