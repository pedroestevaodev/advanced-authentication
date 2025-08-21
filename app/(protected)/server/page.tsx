import { UserInfo } from "@/components/user-info";
import { auth } from "@/lib/auth";

const ServerPage = async () => {
  const session = await auth();

  return <UserInfo user={session?.user} label="Server Page" />;
};

export default ServerPage;
