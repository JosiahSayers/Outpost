import LocationSearchEditor from "$/frontend/trip/header/location-search-editor";
import TripTextField from "$/frontend/trip/header/trip-text-field";
import { placesKeys } from "$/frontend/utils/api/places";
import type { ClientPlace } from "$/transformers/place";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import { useState } from "react";

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

const places: ClientPlace[] = [
  {
    id: "1",
    name: "Mount Rainier National Park",
    state: "WA",
    publicAccess: "Open",
  },
  {
    id: "2",
    name: "Mount Baker Wilderness",
    state: "WA",
    publicAccess: "Open",
  },
];

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

// Stands in for the React Query cache owner: seeds the places search so the
// hook resolves from cache (no network), and updates the value on save.
function renderField({
  initialValue,
  onSave,
  seedQuery,
}: {
  initialValue: string | null;
  onSave?: (value: string) => void;
  seedQuery?: string;
}) {
  const queryClient = makeQueryClient();
  if (seedQuery !== undefined) {
    queryClient.setQueryData(placesKeys.search(seedQuery), places);
  }
  // Any un-seeded search key hits the network; keep it harmless.
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ places: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;

  function Wrapper() {
    const [current, setCurrent] = useState<string | null>(initialValue);
    return (
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={{ respectReducedMotion: true }}>
          <TripTextField
            icon={null}
            value={current}
            placeholder="Add a location"
            onSave={(next) => {
              onSave?.(next);
              setCurrent(next);
            }}
            renderEditor={(props) => <LocationSearchEditor {...props} />}
          />
        </MantineProvider>
      </QueryClientProvider>
    );
  }

  render(<Wrapper />);
}

describe("entering edit mode", () => {
  it("shows an input pre-filled with the current location", async () => {
    renderField({ initialValue: "Yosemite" });
    fireEvent.click(screen.getByText("Yosemite"));
    await waitFor(() => {});
    expect(screen.getByRole("textbox")).toHaveValue("Yosemite");
  });

  it("shows the placeholder when there is no location", async () => {
    renderField({ initialValue: null });
    expect(screen.getByText("Add a location")).toBeInTheDocument();
  });
});

describe("searching", () => {
  it("shows matching places from the search endpoint after typing", async () => {
    renderField({ initialValue: null, seedQuery: "Mount" });
    fireEvent.click(screen.getByText("Add a location"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Mount" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Mount Rainier National Park"),
      ).toBeInTheDocument();
      expect(screen.getByText("Mount Baker Wilderness")).toBeInTheDocument();
    });
  });
});

describe("selecting a suggestion", () => {
  it("commits the formatted place name and returns to view mode", async () => {
    const onSave = mock();
    renderField({ initialValue: null, onSave, seedQuery: "Mount" });
    fireEvent.click(screen.getByText("Add a location"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Mount" },
    });

    await waitFor(() => screen.getByText("Mount Rainier National Park"));
    fireEvent.click(screen.getByText("Mount Rainier National Park"));

    expect(onSave).toHaveBeenCalledWith("Mount Rainier National Park, WA");
    await waitFor(() =>
      expect(
        screen.getByText("Mount Rainier National Park, WA"),
      ).toBeInTheDocument(),
    );
  });
});

describe("freeform entry", () => {
  it("commits the typed draft on Enter", async () => {
    const onSave = mock();
    renderField({ initialValue: null, onSave });
    fireEvent.click(screen.getByText("Add a location"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Somewhere remote" },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });

    expect(onSave).toHaveBeenCalledWith("Somewhere remote");
    await waitFor(() =>
      expect(screen.getByText("Somewhere remote")).toBeInTheDocument(),
    );
  });

  it("cancels on Escape without saving", async () => {
    const onSave = mock();
    renderField({ initialValue: "Yosemite", onSave });
    fireEvent.click(screen.getByText("Yosemite"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Zion" },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });

    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText("Yosemite")).toBeInTheDocument(),
    );
  });
});
