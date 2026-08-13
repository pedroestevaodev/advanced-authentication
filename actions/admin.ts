"use server";

import { UserRole } from "@prisma/client";
import { getCurrentRole } from "@/data/account";

export const admin = async () => {
  const role = await getCurrentRole();

  if (role === UserRole.ADMIN) {
    return { success: "Allowed Server Action!" };
  }

  return { error: "Forbidden Server Action!" };
};
