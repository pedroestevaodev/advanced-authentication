import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentRole } from "@/data/account";

export const GET = async () => {
  const role = await getCurrentRole();

  if (role === UserRole.ADMIN) {
    return new NextResponse(null, { status: 200 });
  }

  return new NextResponse(null, { status: 403 });
};
