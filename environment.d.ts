declare module "bun" {
  interface Env {
    DATABASE_URL: string;
    LOG_FOLDER: string;
  }
}

declare namespace Express {
  interface Request {
    start: number;
    id: string;
    logger: import("winston").Logger;
    session?: import("$/utils/auth").Session;
  }
}
