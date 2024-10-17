namespace NodeJS {
    export interface ProcessEnv {
        DATABASE_URL: string;
        AUTH_SECRET: string;
        AUTH_URL: string;
        APPLICATION_URL: string;
        NODE_ENV: string;
    }
}