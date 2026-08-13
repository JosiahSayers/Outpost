import {
  healthKeys,
  type HealthCheckResult,
} from "$/frontend/utils/api/health";
import { useVersionDrift } from "$/frontend/utils/hooks/use-version-drift";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

function jsonResponse(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const originalFetch = global.fetch;
let healthResult: HealthCheckResult = {};
let priorSha: string | undefined;

function Display() {
  const hasDrift = useVersionDrift();
  return <div data-testid="rendered">{String(hasDrift)}</div>;
}

function renderDisplay(initial: HealthCheckResult) {
  healthResult = initial;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <Display />
    </QueryClientProvider>,
  );

  return queryClient;
}

beforeEach(() => {
  priorSha = Bun.env.BUN_PUBLIC_SHA;
  Bun.env.BUN_PUBLIC_SHA = "current-sha";
  global.fetch = mock(() =>
    jsonResponse(healthResult),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  Bun.env.BUN_PUBLIC_SHA = priorSha as string;
  global.fetch = originalFetch;
});

it("is false when the backend sha matches the running build", async () => {
  renderDisplay({ sha: "current-sha" });
  await waitFor(() =>
    expect(screen.getByTestId("rendered")).toHaveTextContent("false"),
  );
});

it("is true when the backend sha differs from the running build", async () => {
  renderDisplay({ sha: "new-sha" });
  await waitFor(() =>
    expect(screen.getByTestId("rendered")).toHaveTextContent("true"),
  );
});

describe("when data is missing", () => {
  it("is false while the health check hasn't resolved yet", () => {
    renderDisplay({ sha: "new-sha" });
    expect(screen.getByTestId("rendered")).toHaveTextContent("false");
  });

  it("is false when the app sha isn't set", async () => {
    Bun.env.BUN_PUBLIC_SHA = "";
    renderDisplay({ sha: "new-sha" });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/health", undefined),
    );
    expect(screen.getByTestId("rendered")).toHaveTextContent("false");
  });
});
