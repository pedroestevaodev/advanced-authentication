import { UserRole } from "@prisma/client";
import { ExtendedUser } from "./next-auth";

export interface BackButtonProps {
  href: string;
  label: string;
}

export interface CardWrapperProps {
  children: React.ReactNode;
  headerLabel: string;
  backButtonLabel: string;
  backButtonHref: string;
  showSocial?: boolean;
}

export interface FormProps {
  message?: string;
}

export interface HeaderProps {
  label: string;
}

export interface LoginButtonProps {
  children: React.ReactNode;
  mode?: "modal" | "redirect";
  asChild?: boolean;
}

export interface RoleGateProps {
  children: React.ReactNode;
  allowedRole: UserRole;
}

export interface UserInfoProps {
  label: string;
  user?: ExtendedUser;
}
