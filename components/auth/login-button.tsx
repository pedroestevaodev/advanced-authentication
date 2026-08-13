"use client";

import { Slot } from "@radix-ui/react-slot";
import { useRouter } from "next/navigation";
import type { LoginButtonProps } from "@/types/components";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { LoginForm } from "./login-form";

const LoginButton = ({
  children,
  mode = "redirect",
  asChild,
}: LoginButtonProps) => {
  const router = useRouter();

  const onClick = () => {
    router.push("/auth/login");
  };

  if (mode === "modal") {
    return (
      <Dialog>
        <DialogTrigger asChild={asChild}>{children}</DialogTrigger>
        <DialogContent className="p-0 w-auto bg-transparent">
          <LoginForm />
        </DialogContent>
      </Dialog>
    );
  }

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      type={asChild ? undefined : "button"}
      onClick={onClick}
      className={asChild ? undefined : "cursor-pointer w-fit"}
    >
      {children}
    </Comp>
  );
};

export { LoginButton };
