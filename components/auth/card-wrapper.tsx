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
        {children}
      </CardContent>
      {showSocial && (
        <CardFooter>
          <Social />
        </CardFooter>
      )}
      <CardFooter className="justify-center">
        <BackButton label={backButtonLabel} href={backButtonHref} />
      </CardFooter>
    </Card>
  );
};

export { CardWrapper };
