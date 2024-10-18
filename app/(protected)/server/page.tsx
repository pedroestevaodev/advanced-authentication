import UserInfo from "@/components/UserInfo";
import { auth } from "@/services/auth";

const ServerPage = async () => {
    const session = await auth();
    return (
        <UserInfo user={session?.user} label="Server Page" />
    );
};

export default ServerPage;