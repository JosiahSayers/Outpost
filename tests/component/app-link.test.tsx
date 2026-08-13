import AppLink from "$/frontend/app-link";
import {
  healthKeys,
  type HealthCheckResult,
} from "$/frontend/utils/api/health";
import { Button, MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

function jsonResponse(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const originalFetch = global.fetch;
let priorSha: string | undefined;

function renderWithDrift(
  hasDrift: boolean,
  ui: React.ReactElement,
  navigate: (to: string) => void = () => {},
) {
  const healthResult: HealthCheckResult = {
    sha: hasDrift ? "new-sha" : "current-sha",
  };
  global.fetch = mock(() =>
    jsonResponse(healthResult),
  ) as unknown as typeof fetch;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // Pre-seed the query cache so the drift comparison is settled by the time
  // the first render commits, instead of racing an async fetch.
  queryClient.setQueryData(healthKeys.check, healthResult);

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Router hook={() => ["/other", navigate]}>{ui}</Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  priorSha = Bun.env.BUN_PUBLIC_SHA;
  Bun.env.BUN_PUBLIC_SHA = "current-sha";
});

afterEach(() => {
  Bun.env.BUN_PUBLIC_SHA = priorSha as string;
  global.fetch = originalFetch;
});

describe("when there is no version drift", () => {
  it("routes within the SPA on click", () => {
    const navigate = mock((_to: string) => {});
    renderWithDrift(
      false,
      <AppLink href="/sign-in">Sign in</AppLink>,
      navigate,
    );

    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link).toHaveAttribute("href", "/sign-in");
    fireEvent.click(link, { button: 0 });
    expect(navigate.mock.calls[0]?.[0]).toBe("/sign-in");
  });

  it("stays prop-transparent when used as a Mantine polymorphic component", () => {
    const navigate = mock((_to: string) => {});
    renderWithDrift(
      false,
      <Button component={AppLink} href="/register">
        Create an account
      </Button>,
      navigate,
    );

    const link = screen.getByRole("link", { name: "Create an account" });
    expect(link).toHaveAttribute("href", "/register");
    fireEvent.click(link, { button: 0 });
    expect(navigate.mock.calls[0]?.[0]).toBe("/register");
  });
});

describe("when there is version drift", () => {
  it("renders a plain anchor instead of routing within the SPA", () => {
    const navigate = mock((_to: string) => {});
    renderWithDrift(true, <AppLink href="/sign-in">Sign in</AppLink>, navigate);

    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link).toHaveAttribute("href", "/sign-in");
    fireEvent.click(link, { button: 0 });
    expect(navigate).not.toHaveBeenCalled();
  });
});
