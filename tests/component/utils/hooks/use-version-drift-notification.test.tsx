import {
  healthKeys,
  type HealthCheckResult,
} from "$/frontend/utils/api/health";
import { useVersionDriftNotification } from "$/frontend/utils/hooks/use-version-drift-notification";
import { MantineProvider } from "@mantine/core";
import type { NotificationData } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const showToast = mock((_notification: NotificationData) => "");
const reload = mock(() => {});

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

function Display() {
  useVersionDriftNotification(showToast);
  return <div data-testid="rendered" />;
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

// The toast body is a ReactNode, not a plain string — render a given call's
// `message` to assert on/interact with it.
function renderToastMessage(callIndex: number) {
  const call = showToast.mock.calls[callIndex]?.[0];
  return render(<MantineProvider>{call?.message}</MantineProvider>);
}

let priorSha: string | undefined;
// Patch just `reload` in place rather than replacing `window.location`
// wholesale — `window.location` is a single object shared by the whole test
// process (not reset per file), and a plain `{ ...window.location, reload }`
// spread only copies its own enumerable properties. In happy-dom, `search`/
// `pathname`/etc. are prototype accessors, not own properties, so a wholesale
// replacement silently drops them for every test that runs afterward,
// anywhere in the suite — including unrelated files, order/timing permitting.
const originalReload = Object.getOwnPropertyDescriptor(
  window.location,
  "reload",
);

beforeEach(() => {
  priorSha = Bun.env.BUN_PUBLIC_SHA;
  Bun.env.BUN_PUBLIC_SHA = "current-sha";
  showToast.mockReset();
  reload.mockReset();
  Object.defineProperty(window.location, "reload", {
    value: reload,
    writable: true,
    configurable: true,
  });
  global.fetch = mock(() =>
    jsonResponse(healthResult),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  Bun.env.BUN_PUBLIC_SHA = priorSha as string;
  global.fetch = originalFetch;
  if (originalReload) {
    Object.defineProperty(window.location, "reload", originalReload);
  }
});

it("does not toast when the backend sha matches the running build", async () => {
  renderDisplay({ sha: "current-sha" });
  await waitFor(() =>
    expect(screen.getByTestId("rendered")).toBeInTheDocument(),
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(showToast).not.toHaveBeenCalled();
});

describe("when the backend sha differs from the running build", () => {
  it("shows a persistent toast with a working reload button", async () => {
    renderDisplay({ sha: "new-sha" });

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    const call = showToast.mock.calls[0]?.[0];
    expect(call?.autoClose).toBe(false);
    expect(call?.color).toBe("trail-dust");

    const { getByText } = renderToastMessage(0);
    fireEvent.click(getByText("Reload"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not toast again on a later poll with the same drifted sha", async () => {
    const queryClient = renderDisplay({ sha: "new-sha" });
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));

    queryClient.setQueryData(healthKeys.check, { sha: "new-sha" });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(showToast).toHaveBeenCalledTimes(1);
  });
});
