"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "../ui/button";
import { loginProviders } from "@/actions/othersProviders";
import { GitHubIcon, GoogleIcon } from "../icons";

const Social = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  return (
    <div className="flex items-center gap-x-2 w-full">
      <Button
        size="lg"
        className="w-full"
        variant="outline"
        onClick={() => loginProviders("google", callbackUrl)}
      >
        <GoogleIcon size={20} />
      </Button>

      <Button
        size="lg"
        className="w-full"
        variant="outline"
        onClick={() => loginProviders("github", callbackUrl)}
      >
        <GitHubIcon size={20} />
      </Button>
    </div>
  );
};

export { Social };
