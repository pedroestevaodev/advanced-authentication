import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface FormWarningProps {
    message?: string;
};

export const FormWarning = ({ message }: FormWarningProps) => {
    if (!message) return null;
    
    return (
        <div className="bg-amber-500/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-amber-500 w-full">
            <ExclamationTriangleIcon className="h-4 w-4 min-h-4 min-w-4" />
            <p>{message}</p>
        </div>
    )
};