import { poppins } from "@/config/fonts";
import { cn } from "@/lib/utils";

interface HeaderProps {
    label: string;
};

const Header = ({ label }: HeaderProps) => {
    return (
        <div className="flex flex-col gap-y-4 items-center justify-center w-full">
            <h1 className={cn(
                "text-3xl font-semibold",
                poppins.className,
            )}>
                Auth
            </h1>
            <p className="text-muted-foreground text-sm">
                {label}
            </p>
        </div>
    );
};

export default Header;