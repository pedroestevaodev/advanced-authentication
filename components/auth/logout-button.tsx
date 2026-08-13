import type { ChildrenProps } from "@/types/nextjs";

const LogoutButton = ({ children }: ChildrenProps) => {
  return (
    <div className="flex items-center cursor-pointer w-full">{children}</div>
  );
};

export { LogoutButton };
