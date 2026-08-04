// Inlined at bundle time — bunfig.toml's [serve.static] env config (dev) and
// the Dockerfile's `bun build --env` flag (prod) replace this literal
// `process.env.BUN_PUBLIC_SHA` reference with the build's commit sha. Kept
// behind a function (rather than a top-level const) so tests can still
// control it via `Bun.env.BUN_PUBLIC_SHA` — a const would freeze whatever
// value was present the first time this module is imported, before any
// test's `beforeEach` runs.
export function getAppSha() {
  return process.env.BUN_PUBLIC_SHA;
}
