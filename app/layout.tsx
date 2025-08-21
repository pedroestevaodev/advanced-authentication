import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import { ChildrenProps } from "@/types/nextjs";
import { cn } from "@/lib/utils";
import { fontSans } from "@/config/fonts";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
	title: {
		default: siteConfig.name,
		template: `%s - ${siteConfig.name}`,
	},
	description: siteConfig.description,
	icons: {
		icon: "/favicon.ico",
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "white" },
		{ media: "(prefers-color-scheme: dark)", color: "black" },
	],
};

const RootLayout = ({
	children,
}: ChildrenProps) => {
	return (
		<html suppressHydrationWarning lang="pt-BR">
			<body
				className={cn(
					"min-h-screen bg-[#fafafa] antialiased",
					fontSans.className,
				)}
			>
				<Providers>
					{children}
				</Providers>
			</body>
		</html>
	);
};

export default RootLayout;
