import { CardWrapperProps } from "@/types/components";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { FormWarning } from "../forms/form-warning";
import { BackButton } from "./back-button";
import { Header } from "./header";
import { Social } from "./social";

const CardWrapper = ({
  children,
  headerLabel,
  backButtonLabel,
  backButtonHref,
  showSocial,
}: CardWrapperProps) => {
  return (
    <Card className="w-[400px] shadow-md">
      <CardHeader>
        <Header label={headerLabel} />
      </CardHeader>
      <CardContent>
        <div className="flex w-full mb-4">
          <FormWarning message="Unfortunately, credential-based login is not working due to Resend's limitations with free domain verification on Vercel!" />
        </div>
        {children}
      </CardContent>
      {showSocial && (
        <CardFooter>
          <Social />
        </CardFooter>
      )}
      <CardFooter>
        <BackButton label={backButtonLabel} href={backButtonHref} />
      </CardFooter>
    </Card>
  );
};

export { CardWrapper };
