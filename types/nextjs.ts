import { siteConfig } from "@/config/site";

export interface ChildrenProps {
	children: React.ReactNode;
};

export type NextSearchParams = { [key: string]: string | string[] | undefined };

export type NextServerComponentsParams<T = any> = {
	params: T;
	searchParams?: { [key: string]: string | string[] | undefined };
};

export type NextServerParams = {
	params: { [key: string]: string | string[] };
};

export interface ErrorPageProps {
	error: Error;
	reset: () => void;
};

export type SWRDataType<T = any> = {
	limit: number;
    page: number;
    results: T[];
    total: number;
    totalPages: number;
};

export type SiteConfig = typeof siteConfig;