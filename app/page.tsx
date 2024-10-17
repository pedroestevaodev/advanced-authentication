import LoginButton from "@/components/auth/LoginButton";
import { Button } from "@/components/ui/button";

const Home = () => {
	return (
		<div className="relative flex flex-col">
			<main className="relative flex flex-grow min-h-screen">
				<LoginButton>
					<Button
						variant="secondary"
						size="lg"
					>
						Sign in
					</Button>
				</LoginButton>
			</main>
		</div>
	);
}

export default Home;