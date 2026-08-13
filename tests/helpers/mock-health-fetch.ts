import { mock } from "bun:test";

/**
 * AppLink checks for version drift via useHealthCheck (GET /health) on every
 * render, so any component test that renders a link now needs a QueryClient
 * ancestor and a mocked fetch response, or it'll throw ("No QueryClient set")
 * or hit a real network call. Call in beforeEach, restore with the returned
 * function in afterEach.
 */
export function mockHealthFetch() {
  const originalFetch = global.fetch;
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ sha: "test-sha" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;

  return () => {
    global.fetch = originalFetch;
  };
}
