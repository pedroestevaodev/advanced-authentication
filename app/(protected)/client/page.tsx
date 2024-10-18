'use client';

import UserInfo from "@/components/UserInfo";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const ClientPage = () => {
    const user = useCurrentUser();
    return (
        <UserInfo user={user} label="Client Page" />
    );
};

export default ClientPage;