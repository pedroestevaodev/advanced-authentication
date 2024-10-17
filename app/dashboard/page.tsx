import { auth } from "@/services/auth";

const Dashboard = async () => {
    const session = await auth();
    
    return (
        <div className="flex flex-col gap-10 pt-5">
            <span>Olá, { session?.user?.name }</span>
        </div>
    );
};

export default Dashboard;