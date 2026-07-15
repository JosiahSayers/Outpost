import express, { Router } from "express";

/**
 * Serves brand images (logo, etc.) referenced by outgoing emails, for local
 * dev only. In staging/production Caddy serves this same /email-assets
 * path directly from a shared volume (see docker-compose.staging.yml) so
 * Express never sees the traffic; this route exists so the same URLs
 * resolve when running `bun dev`, where there's no Caddy in front.
 *
 * Deliberately unauthenticated — recipients' email clients fetch these
 * over plain HTTP with no session, the same way they'd fetch any other
 * hosted email image. Files are served directly from disk by filename
 * (no bundler hashing) so URLs referenced from app/emails/theme.ts stay
 * stable across deploys.
 */
export const emailAssetsRouter = Router();

emailAssetsRouter.use(express.static("assets/images"));
