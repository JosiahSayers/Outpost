import QuickAddInput from "$/frontend/trip/meal-plan/day-edit-drawer/quick-add-input";
import { mealPlanItemSearchKeys } from "$/frontend/utils/api/meal-plan";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// matchMedia mock + respectReducedMotion keeps Mantine's Combobox popover on
// the synchronous transition path — see new-packing-list-modal.test.tsx.
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

const tripId = "trip-1";

const dinnerMatch: ClientMealPlanItem = {
  id: "item-1",
  name: "Ramen Bomb",
  calories: 890,
  quantity: 1,
  waterMl: 500,
  dryWeightGrams: 210,
  meal: "dinner",
  status: { packed: false, purchased: false },
};

const lunchOther: ClientMealPlanItem = {
  id: "item-2",
  name: "Ramen Noodles",
  calories: 380,
  quantity: 2,
  waterMl: null,
  dryWeightGrams: 85,
  meal: "lunch",
  status: { packed: false, purchased: false },
};

const onAdd = mock((_name: string) => {});
const onSelectExisting = mock((_item: ClientMealPlanItem) => {});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

// Stands in for the React Query cache owner: seeds the item search so the
// hook can resolve from cache, and backs a mocked fetch with the same seed so
// results are also correct when SearchCombobox's focus-triggered invalidation
// (see search-combobox.tsx) forces a real refetch instead of trusting the
// cache. Any un-seeded query hits the network via a mocked fetch that
// resolves empty, unless a pending fetch is supplied instead.
function renderInput({
  seedQuery,
  seedItems,
  fetchImpl,
}: {
  seedQuery?: string;
  seedItems?: ClientMealPlanItem[];
  fetchImpl?: typeof fetch;
} = {}) {
  const queryClient = makeQueryClient();
  if (seedQuery !== undefined) {
    queryClient.setQueryData(
      mealPlanItemSearchKeys.search(seedQuery),
      seedItems ?? [],
    );
  }
  global.fetch =
    fetchImpl ??
    (mock((url: string) => {
      const matchesSeed =
        seedQuery !== undefined &&
        url.includes(`query=${encodeURIComponent(seedQuery)}`);
      return Promise.resolve(
        new Response(
          JSON.stringify({ items: matchesSeed ? (seedItems ?? []) : [] }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    }) as unknown as typeof fetch);

  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <QuickAddInput
          meal="dinner"
          tripId={tripId}
          onAdd={onAdd}
          onSelectExisting={onSelectExisting}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  onAdd.mockReset();
  onSelectExisting.mockReset();
});

it("labels the input for the given meal", async () => {
  renderInput();
  await waitFor(() => {});
  expect(
    screen.getByRole("textbox", { name: "Add to Dinner" }),
  ).toBeInTheDocument();
});

describe("freeform entry", () => {
  it("calls onAdd with the trimmed name on Enter and clears the input", async () => {
    renderInput();
    const input = screen.getByRole("textbox", { name: "Add to Dinner" });

    fireEvent.change(input, { target: { value: "  Pad Thai  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {});

    expect(onAdd).toHaveBeenCalledWith("Pad Thai");
    expect(input).toHaveValue("");
  });

  it("does not call onAdd when the input is blank", async () => {
    renderInput();
    const input = screen.getByRole("textbox", { name: "Add to Dinner" });

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {});

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("does not call onAdd on blur, leaving the typed text in place", async () => {
    renderInput();
    const input = screen.getByRole("textbox", { name: "Add to Dinner" });

    fireEvent.change(input, { target: { value: "  Pad Thai  " } });
    fireEvent.blur(input);
    await waitFor(() => {});

    expect(onAdd).not.toHaveBeenCalled();
    expect(input).toHaveValue("  Pad Thai  ");
  });
});

describe("searching", () => {
  it("shows each match's calories, water, and dry weight", async () => {
    renderInput({
      seedQuery: "ram",
      seedItems: [dinnerMatch, lunchOther],
    });
    const input = screen.getByRole("textbox", { name: "Add to Dinner" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ram" } });

    await waitFor(() => {
      expect(screen.getByText("Ramen Bomb")).toBeInTheDocument();
      expect(screen.getByText("Ramen Noodles")).toBeInTheDocument();
    });

    expect(screen.getByText("890")).toBeInTheDocument();
    expect(screen.getByText("500 mL")).toBeInTheDocument();
    expect(screen.getByText("210 g")).toBeInTheDocument();

    expect(screen.getByText("380")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("85 g")).toBeInTheDocument();
  });

  it("fills the meal badge for a result matching the searched meal", async () => {
    renderInput({ seedQuery: "ram", seedItems: [dinnerMatch] });
    fireEvent.focus(screen.getByRole("textbox", { name: "Add to Dinner" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Add to Dinner" }), {
      target: { value: "ram" },
    });

    await waitFor(() => screen.getByText("Ramen Bomb"));
    const badge = screen.getByText("Dinner").closest(".mantine-Badge-root");
    expect(badge).toHaveAttribute("data-variant", "filled");
  });

  it("mutes the meal badge for a result from a different meal", async () => {
    renderInput({ seedQuery: "ram", seedItems: [lunchOther] });
    fireEvent.focus(screen.getByRole("textbox", { name: "Add to Dinner" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Add to Dinner" }), {
      target: { value: "ram" },
    });

    await waitFor(() => screen.getByText("Ramen Noodles"));
    const badge = screen.getByText("Lunch").closest(".mantine-Badge-root");
    expect(badge).toHaveAttribute("data-variant", "light");
  });

  it("shows skeleton rows while the search is pending", async () => {
    const pendingFetch = mock(() => new Promise<Response>(() => {}));
    renderInput({ fetchImpl: pendingFetch as unknown as typeof fetch });

    const input = screen.getByRole("textbox", { name: "Add to Dinner" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ram" } });

    await waitFor(
      () =>
        expect(
          document.querySelector(".mantine-Skeleton-root"),
        ).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it("shows a message naming the query when nothing matches", async () => {
    renderInput({ seedQuery: "quinoa", seedItems: [] });
    const input = screen.getByRole("textbox", { name: "Add to Dinner" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "quinoa" } });

    await waitFor(() =>
      expect(
        screen.getByText(
          'No past items match "quinoa" — press Enter to add it as a new item.',
        ),
      ).toBeInTheDocument(),
    );
  });
});

describe("selecting a result", () => {
  it("calls onSelectExisting with the matched item's full data and clears the input", async () => {
    renderInput({ seedQuery: "ram", seedItems: [dinnerMatch] });
    const input = screen.getByRole("textbox", { name: "Add to Dinner" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ram" } });

    await waitFor(() => screen.getByText("Ramen Bomb"));
    fireEvent.click(screen.getByText("Ramen Bomb"));

    expect(onSelectExisting).toHaveBeenCalledWith(dinnerMatch);
    expect(onAdd).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });
});
