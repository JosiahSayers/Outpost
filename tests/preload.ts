import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach } from "bun:test";

// A concrete url (rather than the default "about:blank") is required for
// history.pushState/replaceState to actually update window.location —
// against about:blank they silently no-op instead of navigating, which
// breaks tests of components that drive routing (e.g. wouter) via history.
GlobalRegistrator.register({ url: "http://localhost/" });

// Imported after register() so @testing-library/react sees a live DOM on init,
// and its internal beforeAll() runs at module load time (not inside a test).
const { cleanup } = await import("@testing-library/react");

// Database reset/seed/snapshot lifecycle lives in integration-preload.ts,
// loaded only for `bun run test:integration`. Unit and component tests never
// touch the database, so they skip that setup entirely (see CLAUDE.md).

afterEach(() => {
  cleanup();
});
