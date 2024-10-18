import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import Header from "@/components/auth/Header";
import BackButton from "@/components/auth/BackButton";
import CardWrapper from "../CardWrapper";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

const ErrorCard = () => {
    return (
        <CardWrapper
            headerLabel="Oops! Something went wrong!"
            backButtonHref="/auth/login"
            backButtonLabel="Back to login"
        >
            <div className="flex items-center justify-center w-full">
                <ExclamationTriangleIcon className="w-16 h-16 text-destructive" />
            </div>
        </CardWrapper>
    );
};

export default ErrorCard;