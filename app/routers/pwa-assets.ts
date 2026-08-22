import express, { Router } from "express";

/**
 * Serves the PWA manifest's icon files and the service worker script, for
 * local dev only. In staging/production Caddy serves these same paths
 * directly from the built dist/frontend output (see docker-compose.staging.yml
 * and the Dockerfile's copy of app/frontend/public/ into dist/frontend).
 *
 * These can't go through Bun's HTML-entry bundler like other frontend
 * assets: Bun doesn't resolve icon references nested inside a referenced
 * manifest.json, and a service worker script specifically needs a stable,
 * unhashed URL (the browser's update check byte-compares the same fixed
 * path across deploys) rather than a content-hashed bundle output.
 */
export const pwaAssetsRouter = Router();

pwaAssetsRouter.use(express.static("app/frontend/public"));
