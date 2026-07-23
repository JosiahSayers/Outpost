import SearchCombobox, {
  type SearchComboboxProps,
} from "$/frontend/shared-components/search-combobox";
import { MantineProvider, Text } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// matchMedia mock + respectReducedMotion:true makes Mantine's Transition (used
// by the Combobox popover) take the synchronous path instead of scheduling a
// rAF that would fire outside act(). See new-packing-list-modal.test.tsx for
// the full rationale.
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

interface TestItem {
  id: number;
  name: string;
}

const items: TestItem[] = [
  { id: 1, name: "Alpha" },
  { id: 2, name: "Bravo" },
];

const onValueChange = mock((_value: string) => {});
const onOptionSubmit = mock((_item: TestItem) => {});

function renderCombobox(
  overrides: Partial<SearchComboboxProps<TestItem>> = {},
) {
  const props: SearchComboboxProps<TestItem> = {
    label: "Search",
    value: "",
    onValueChange,
    results: items,
    isFetching: false,
    getOptionValue: (item) => String(item.id),
    onOptionSubmit,
    icon: <span data-testid="icon" />,
    renderOption: (item) => <Text>{item.name}</Text>,
    emptyMessage: "Nothing found",
    ...overrides,
  };
  return render(
    <MantineProvider theme={{ respectReducedMotion: true }}>
      <SearchCombobox {...props} />
    </MantineProvider>,
  );
}

/** Focus the input to open the dropdown, then let async effects settle. */
async function openDropdown() {
  fireEvent.focus(screen.getByLabelText("Search"));
  await waitFor(() => {});
}

beforeEach(() => {
  onValueChange.mockReset();
  onOptionSubmit.mockReset();
});

describe("the input", () => {
  it("renders with the given label", async () => {
    renderCombobox();
    await waitFor(() => {});
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });

  it("reflects the controlled value", async () => {
    renderCombobox({ value: "Alp" });
    await waitFor(() => {});
    expect(screen.getByLabelText("Search")).toHaveValue("Alp");
  });

  it("calls onValueChange as the user types", async () => {
    renderCombobox();
    await waitFor(() => {});
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "Br" },
    });
    expect(onValueChange).toHaveBeenCalledWith("Br");
  });

  // The loader has no accessible role, so it's found by its Mantine class.
  it("shows a loader while fetching", async () => {
    const { container } = renderCombobox({ isFetching: true });
    await waitFor(() => {});
    expect(container.querySelector(".mantine-Loader-root")).toBeInTheDocument();
  });

  it("does not show a loader when not fetching", async () => {
    const { container } = renderCombobox({ isFetching: false });
    await waitFor(() => {});
    expect(
      container.querySelector(".mantine-Loader-root"),
    ).not.toBeInTheDocument();
  });
});

describe("the dropdown", () => {
  it("renders each result via renderOption once opened", async () => {
    renderCombobox();
    await openDropdown();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Bravo")).toBeInTheDocument();
  });

  it("renders the icon alongside each result", async () => {
    renderCombobox();
    await openDropdown();
    expect(screen.getAllByTestId("icon")).toHaveLength(items.length);
  });

  it("calls onOptionSubmit with the picked item when an option is clicked", async () => {
    renderCombobox();
    await openDropdown();
    fireEvent.click(screen.getByText("Bravo"));
    expect(onOptionSubmit).toHaveBeenCalledTimes(1);
    expect(onOptionSubmit).toHaveBeenCalledWith({ id: 2, name: "Bravo" });
  });

  it("shows the empty message when a completed search has no results", async () => {
    renderCombobox({ results: [], isFetching: false });
    await openDropdown();
    expect(screen.getByText("Nothing found")).toBeInTheDocument();
  });

  it("shows a searching state while fetching with no results yet", async () => {
    renderCombobox({ results: [], isFetching: true });
    await openDropdown();
    expect(screen.getByText("Searching…")).toBeInTheDocument();
    expect(screen.queryByText("Nothing found")).not.toBeInTheDocument();
  });

  it("does not show the empty message while results are present", async () => {
    renderCombobox();
    await openDropdown();
    expect(screen.queryByText("Nothing found")).not.toBeInTheDocument();
  });

  it("hides the dropdown contents when hidden is true", async () => {
    renderCombobox({ hidden: true });
    await openDropdown();
    // Mantine keeps the options mounted but hidden, so assert on visibility.
    expect(screen.getByText("Alpha")).not.toBeVisible();
  });
});
