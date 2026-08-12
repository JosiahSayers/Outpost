import MealDetailPanel from "$/frontend/admin/meals/meal-detail-panel";
import type { ClientAdminPublicMealItem } from "$/transformers/admin/public-meal-item";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, mock } from "bun:test";

// respectReducedMotion + a matching matchMedia mock make the delete
// confirmation Modal's Transition take the synchronous (duration=0) path
// instead of scheduling requestAnimationFrame — see
// tests/component/admin/user-sessions/index.test.tsx for the same pattern.
window.matchMedia = (query: string) =>
  ({
    matches: query === "(prefers-reduced-motion: reduce)",
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

function makeMeal(
  overrides: Partial<ClientAdminPublicMealItem> = {},
): ClientAdminPublicMealItem {
  return {
    id: "meal-1",
    name: "White Chicken Chili",
    brand: "Peak Refuel",
    calories: 760,
    waterMl: 237,
    dryWeightGrams: 140,
    sourceVendor: "peak_refuel",
    sourceProductId: "chili-1",
    sourceUrl: "https://example.com/products/chili-1",
    sourceImageUrl: null,
    imageUrl: null,
    ...overrides,
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderPanel(
  props: Partial<Parameters<typeof MealDetailPanel>[0]> = {},
) {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <MealDetailPanel
          meal={makeMeal()}
          onCreated={() => {}}
          onUpdated={() => {}}
          onDeleted={() => {}}
          onCancel={() => {}}
          {...props}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

function openDeleteConfirm() {
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
}

function ignoreSwitch() {
  return screen.getByRole("switch", {
    name: "Ignore this meal during future imports?",
  });
}

describe("opening the delete confirmation", () => {
  it("shows the ignore switch checked by default", () => {
    renderPanel();
    openDeleteConfirm();

    expect(ignoreSwitch()).toBeChecked();
  });
});

describe("confirming the deletion", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("deletes with ignore=true when the switch is left checked", async () => {
    global.fetch = mock((url: string, options?: RequestInit) => {
      expect(url).toBe("/admin/meals/meal-1?ignore=true");
      expect(options?.method).toBe("DELETE");
      return Promise.resolve(new Response(null, { status: 200 }));
    }) as unknown as typeof fetch;

    renderPanel();
    openDeleteConfirm();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete",
      }),
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  it("deletes with ignore=false when the switch is unchecked first", async () => {
    global.fetch = mock((url: string, options?: RequestInit) => {
      expect(url).toBe("/admin/meals/meal-1?ignore=false");
      expect(options?.method).toBe("DELETE");
      return Promise.resolve(new Response(null, { status: 200 }));
    }) as unknown as typeof fetch;

    renderPanel();
    openDeleteConfirm();
    fireEvent.click(ignoreSwitch());
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete",
      }),
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  it("calls onDeleted after a successful delete", async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response(null, { status: 200 })),
    ) as unknown as typeof fetch;
    const onDeleted = mock(() => {});

    renderPanel({ onDeleted });
    openDeleteConfirm();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete",
      }),
    );

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });
});
