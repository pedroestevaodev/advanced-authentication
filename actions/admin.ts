"use server";

import { getCurrentRole } from "@/data/account";
import { UserRole } from "@prisma/client";

export const admin = async () => {
  const role = await getCurrentRole();

  if (role === UserRole.ADMIN) {
    return { success: "Allowed Server Action!" };
  }

  return { error: "Forbidden Server Action!" };
};
