"use client";

import { useSearchParams } from "next/navigation";
import { loginProviders } from "@/actions/othersProviders";
import { GitHubIcon, GoogleIcon } from "../icons";
import { Button } from "../ui/button";

const Social = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  return (
    <div className="grid grid-cols-2 gap-x-2 w-full">
      <Button
        size="lg"
        className="w-full"
        variant="outline"
        onClick={() => loginProviders("google", callbackUrl)}
      >
        <GoogleIcon className="size-5" />
      </Button>

      <Button
        size="lg"
        className="w-full"
        variant="outline"
        onClick={() => loginProviders("github", callbackUrl)}
      >
        <GitHubIcon className="size-6" />
      </Button>
    </div>
  );
};

export { Social };
