import { logout } from "@/actions/logout";
import type { ChildrenProps } from "@/types/nextjs";

const LogoutButton = ({ children }: ChildrenProps) => {
  const onClick = () => {
    logout();
  };

  return (
    <button
      type="button"
      className="flex items-center cursor-pointer w-full"
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export { LogoutButton };
