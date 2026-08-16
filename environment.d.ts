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
    DB_IP_DIR: string;
    MODEL_ACCESS_KEY: string;
    R2_ACCOUNT_ID?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET?: string;
    R2_PUBLIC_BASE_URL?: string;
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

  interface Locals {
    // Overrides the real R2 client for `tripFileRouter` -- see
    // getR2Client in app/routers/api/trip/file.ts. Only ever set in tests.
    r2Client?: import("$/routers/api/trip/file").TripFileR2Client | null;
  }
}
