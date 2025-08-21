import { Navbar } from "@/components/navbar";
import { ChildrenProps } from "@/types/nextjs";

const ProtectedLayout = ({ children }: ChildrenProps) => {
  return (
    <div className="h-full w-full flex flex-col gap-y-10 items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 to-blue-800 min-h-screen">
      <Navbar />
      {children}
    </div>
  );
};

export default ProtectedLayout;
