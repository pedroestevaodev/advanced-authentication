import { poppins } from "@/config/fonts";
import { cn } from "@/helpers/auxiliary-helpers";
import { HeaderProps } from "@/types/components";

const Header = ({ label }: HeaderProps) => {
  return (
    <div className="flex flex-col gap-y-4 items-center justify-center w-full">
      <h1 className={cn("text-3xl font-semibold", poppins.className)}>Auth</h1>
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
};

export { Header };
