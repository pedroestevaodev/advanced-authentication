import LoginButton from "@/components/auth/LoginButton";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const Home = () => {
	return (
		<div className="relative flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 to-blue-800">
			<main className="relative flex flex-grow items-center justify-center min-h-screen">
				<div className="space-y-6 text-center">
					<div className="flex items-center gap-2">
						<Image 
							src={`/imgs/logo-sm.webp`}
							width={100}
							height={110}
							alt="Auth.js Logo"
						/>
						<h1 className="text-6xl font-semibold text-white drop-shadow-md">
							Auth.js
						</h1>
					</div>
					<div className="flex flex-col gap-10">
						<p className="text-white text-lg">
							A simple authentication service
						</p>
						<LoginButton asChild>
							<Button
								variant="secondary"
								size="lg"
							>
								Sign in
							</Button>
						</LoginButton>
					</div>
				</div>
			</main>
		</div>
	);
}

export default Home;