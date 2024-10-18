namespace NodeJS {
    export interface ProcessEnv {
        DATABASE_URL: string;
        AUTH_SECRET: string;
        AUTH_URL: string;
        APPLICATION_URL: string;
        GITHUB_CLIENT_ID: string;
        GITHUB_CLIENT_SECRET: string;
        GOOGLE_CLIENT_ID: string;
        GOOGLE_CLIENT_SECRET: string;
        RESEND_API_KEY: string;
        NEXT_PUBLIC_APP_URL: string;
        NODE_ENV: string;
    }
}