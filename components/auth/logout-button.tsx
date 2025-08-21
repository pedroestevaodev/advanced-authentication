import { logout } from "@/actions/logout";
import { ChildrenProps } from "@/types/nextjs";

const LogoutButton = ({ children }: ChildrenProps) => {
  const onClick = () => {
    logout();
  };

  return (
    <span className="flex items-center cursor-pointer w-full" onClick={onClick}>
      {children}
    </span>
  );
};

export { LogoutButton };
