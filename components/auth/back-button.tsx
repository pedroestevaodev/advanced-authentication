import Link from "next/link";
import type { BackButtonProps } from "@/types/components";
import { Button } from "../ui/button";

const BackButton = ({ href, label }: BackButtonProps) => {
  return (
    <Button className="font-normal w-fit" variant="link" size="sm" asChild>
      <Link href={href}>{label}</Link>
    </Button>
  );
};

export { BackButton };
