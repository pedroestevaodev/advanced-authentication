import { ChildrenProps } from "@/types/nextjs";

const AuthLayout = async ({ children }: ChildrenProps) => {
  return (
    <div className="relative flex flex-col">
      <div className="relative flex flex-grow min-h-screen items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
