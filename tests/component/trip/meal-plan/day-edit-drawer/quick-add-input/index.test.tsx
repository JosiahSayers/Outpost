import QuickAddInput from "$/frontend/trip/meal-plan/day-edit-drawer/quick-add-input";
import {
  mealPlanItemSearchKeys,
  type ClientMealPlanItemSearchResult,
} from "$/frontend/utils/api/meal-plan";
import type { ClientMealPlanItemSummary } from "$/transformers/meal-plan/item-summary";
import type { ClientPublicMealItemSummary } from "$/transformers/meal-plan/public-item-summary";
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

const ramenBomb: ClientMealPlanItemSearchResult = {
  source: "own",
  id: "item-1",
  name: "Ramen Bomb",
  brand: "Backpacker's Pantry",
  calories: 890,
  waterMl: 500,
  dryWeightGrams: 210,
};

const ramenNoodles: ClientMealPlanItemSearchResult = {
  source: "own",
  id: "item-2",
  name: "Ramen Noodles",
  brand: null,
  calories: 380,
  waterMl: null,
  dryWeightGrams: 85,
};

const chiliMac: ClientMealPlanItemSearchResult = {
  source: "public",
  id: "public-item-1",
  name: "Chili Mac",
  brand: "Peak Refuel",
  calories: 640,
  waterMl: 300,
  dryWeightGrams: 150,
  imageUrl: "https://images.example.com/chili-mac.webp",
};

const onAdd = mock((_name: string) => {});
const onSelectExisting = mock((_item: ClientMealPlanItemSummary) => {});
const onSelectPublic = mock((_item: ClientPublicMealItemSummary) => {});

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
  seedItems?: ClientMealPlanItemSearchResult[];
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
          onSelectPublic={onSelectPublic}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  onAdd.mockReset();
  onSelectExisting.mockReset();
  onSelectPublic.mockReset();
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
      seedItems: [ramenBomb, ramenNoodles],
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

  it("shows a result's brand when present", async () => {
    renderInput({ seedQuery: "ram", seedItems: [ramenBomb] });
    fireEvent.focus(screen.getByRole("textbox", { name: "Add to Dinner" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Add to Dinner" }), {
      target: { value: "ram" },
    });

    await waitFor(() =>
      expect(screen.getByText("Backpacker's Pantry")).toBeInTheDocument(),
    );
  });

  it("omits the brand text when a result has none", async () => {
    renderInput({ seedQuery: "ram", seedItems: [ramenNoodles] });
    fireEvent.focus(screen.getByRole("textbox", { name: "Add to Dinner" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Add to Dinner" }), {
      target: { value: "ram" },
    });

    await waitFor(() => screen.getByText("Ramen Noodles"));
    expect(screen.queryByText("Backpacker's Pantry")).not.toBeInTheDocument();
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
    renderInput({ seedQuery: "ram", seedItems: [ramenBomb] });
    const input = screen.getByRole("textbox", { name: "Add to Dinner" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ram" } });

    await waitFor(() => screen.getByText("Ramen Bomb"));
    fireEvent.click(screen.getByText("Ramen Bomb"));

    expect(onSelectExisting).toHaveBeenCalledWith(ramenBomb);
    expect(onAdd).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });

  it("calls onSelectPublic (not onSelectExisting) for a public catalog result", async () => {
    renderInput({ seedQuery: "chili", seedItems: [chiliMac] });
    const input = screen.getByRole("textbox", { name: "Add to Dinner" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "chili" } });

    await waitFor(() => screen.getByText("Chili Mac"));
    fireEvent.click(screen.getByText("Chili Mac"));

    expect(onSelectPublic).toHaveBeenCalledWith(chiliMac);
    expect(onSelectExisting).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });
});

describe("public catalog results", () => {
  it("shows a Catalog badge and thumbnail for a public result", async () => {
    renderInput({ seedQuery: "chili", seedItems: [chiliMac] });
    const input = screen.getByRole("textbox", { name: "Add to Dinner" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "chili" } });

    await waitFor(() => screen.getByText("Chili Mac"));
    expect(screen.getByText("Catalog")).toBeInTheDocument();
    // The thumbnail is decorative (alt="") since the name is already shown
    // as text right next to it, so it's not in the accessibility tree --
    // query the DOM directly instead of by role.
    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      chiliMac.imageUrl,
    );
  });

  it("does not show a Catalog badge for an own-item result", async () => {
    renderInput({ seedQuery: "ram", seedItems: [ramenBomb] });
    const input = screen.getByRole("textbox", { name: "Add to Dinner" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ram" } });

    await waitFor(() => screen.getByText("Ramen Bomb"));
    expect(screen.queryByText("Catalog")).not.toBeInTheDocument();
  });
});
