declare module "*.svg" {
  const url: string;
  export default url;
}

declare module "*.css" {}

declare module "bun" {
  interface Env {
    DATABASE_URL: string;
    RESEND_API_KEY: string;
    SENTRY_DSN: string;
    BUN_PUBLIC_SHA: string;
    BUN_PUBLIC_SENTRY_DSN: string;
    BUN_PUBLIC_ENVIRONMENT: string;
    MODEL_ACCESS_KEY: string;
  }
}

declare namespace Express {
  interface Request {
    start: number;
    id: string;
    logger: import("winston").Logger;
    session?: import("$/utils/auth").Session;
    mealPlanDayId?: string;
  }
}
