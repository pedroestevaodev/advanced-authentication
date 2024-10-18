'use client';

import { loginProviders } from "@/actions/othersProviders";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

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
                <FcGoogle className="w-5 h-5" />
            </Button>

            <Button
                size="lg"
                className="w-full"
                variant="outline"
                onClick={() => loginProviders("github", callbackUrl)}
            >
                <FaGithub className="w-5 h-5" />
            </Button>
        </div>
    );
};

export default Social;