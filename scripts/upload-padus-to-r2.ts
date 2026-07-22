#!/usr/bin/env bun
// One-off ops script: uploads a locally-downloaded PAD-US zip to Cloudflare R2
// (via Bun's built-in S3-compatible client, since the file is too large for
// R2's browser upload UI) and prints a presigned GET URL to hand to the
// protected_areas__ingest_padus job as `zipDownloadUrl`.
//
// Usage:
//   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=... \
//     bun run scripts/upload-padus-to-r2.ts <path-to-padus.zip> [objectKey] [expiresInSeconds]
//
// See the bottom of this file / the assistant's chat message for exactly
// which values to grab from the Cloudflare dashboard.

import { S3Client } from "bun";
import path from "node:path";

const MAX_PRESIGN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // hard cap enforced by SigV4
const DEFAULT_EXPIRY_SECONDS = 24 * 60 * 60;

const [localPath, explicitKey, explicitExpiresIn] = process.argv.slice(2);

if (!localPath) {
  console.error(
    "Usage: bun run scripts/upload-padus-to-r2.ts <path-to-padus.zip> [objectKey] [expiresInSeconds]",
  );
  process.exit(1);
}

const requiredEnvVars = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
] as const;

const missing = requiredEnvVars.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(
    `Missing required environment variable(s): ${missing.join(", ")}`,
  );
  console.error(
    "See the Cloudflare dashboard: R2 Object Storage overview page for the " +
      "account id, and R2 -> Manage R2 API Tokens for an access key/secret " +
      "scoped to the target bucket.",
  );
  process.exit(1);
}

const accountId = process.env.R2_ACCOUNT_ID!;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
const bucket = process.env.R2_BUCKET!;

const localFile = Bun.file(localPath);
if (!(await localFile.exists())) {
  console.error(`File not found: ${localPath}`);
  process.exit(1);
}

const objectKey =
  explicitKey ?? `padus/${Date.now()}-${path.basename(localPath)}`;
const expiresIn = Math.min(
  Number(explicitExpiresIn) || DEFAULT_EXPIRY_SECONDS,
  MAX_PRESIGN_EXPIRY_SECONDS,
);

const client = new S3Client({
  accessKeyId,
  secretAccessKey,
  bucket,
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  region: "auto", // R2 ignores region, but Cloudflare's own examples set this
});

const sizeGb = (localFile.size / 1024 ** 3).toFixed(2);
console.log(
  `Uploading ${localPath} (${sizeGb} GiB) to r2://${bucket}/${objectKey} ...`,
);
console.log(
  "This can take a while for multi-GB files -- Bun uploads in parts automatically.",
);

const start = Date.now();
await client.write(objectKey, localFile);
const elapsedSeconds = ((Date.now() - start) / 1000).toFixed(1);
console.log(`Upload complete in ${elapsedSeconds}s.`);

const url = client.presign(objectKey, { expiresIn, method: "GET" });

console.log("\nPresigned download URL (expires in " + expiresIn + "s):");
console.log(url);
console.log(
  '\nPaste this into Bull Board\'s "Add Job" data for protected_areas__ingest_padus, e.g.:',
);
console.log(JSON.stringify({ zipDownloadUrl: url }, null, 2));
