import PackingListSection from "$/frontend/trip/packing-lists";
import {
  mergeCategories,
  packingCompletion,
  placeholderPackingLists,
} from "$/frontend/trip/placeholder-data";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function renderSection() {
  return render(
    <MantineProvider>
      <PackingListSection />
    </MantineProvider>,
  );
}

function pct(packed: number, total: number) {
  return total === 0 ? 0 : Math.round((packed / total) * 100);
}

// Mantine's Collapse keeps a category's items mounted but `inert`/hidden
// until it opens, so role-based item queries only resolve after expanding.
async function openCategory(categoryName: string, exampleItemName: string) {
  fireEvent.click(screen.getByText(categoryName));
  await waitFor(() => screen.getByRole("checkbox", { name: exampleItemName }));
}

describe("rendering", () => {
  it("renders the section title", () => {
    renderSection();
    expect(
      screen.getByRole("heading", { name: "Packing Lists" }),
    ).toBeInTheDocument();
  });

  it("renders the overall packed percentage from the placeholder data", () => {
    renderSection();
    const { packed, total } = packingCompletion(placeholderPackingLists);
    expect(screen.getByText(`${pct(packed, total)}%`)).toBeInTheDocument();
  });

  it("renders one row per merged category", () => {
    renderSection();
    for (const category of mergeCategories(placeholderPackingLists)) {
      expect(screen.getByText(category.name)).toBeInTheDocument();
    }
  });

  it("renders the assign-a-packing-list action", () => {
    renderSection();
    expect(
      screen.getByRole("button", { name: "Assign a packing list" }),
    ).toBeInTheDocument();
  });
});

describe("packing an item", () => {
  it("increases the overall packed percentage", async () => {
    renderSection();
    const { packed, total } = packingCompletion(placeholderPackingLists);

    await openCategory("Shelter", "Stakes (8x)");
    fireEvent.click(screen.getByRole("checkbox", { name: "Stakes (8x)" }));

    await waitFor(() =>
      expect(
        screen.getByText(`${pct(packed + 1, total)}%`),
      ).toBeInTheDocument(),
    );
  });
});

describe("marking an item as not needed", () => {
  it("drops it from both sides of the packed fraction and its checkbox row", async () => {
    renderSection();
    const { packed, total } = packingCompletion(placeholderPackingLists);

    await openCategory("Shelter", "Stakes (8x)");
    fireEvent.click(
      document.querySelector(
        '[aria-label="Mark Stakes (8x) as not needed for this trip"]',
      )!,
    );

    await waitFor(() =>
      expect(
        screen.getByText(`${pct(packed, total - 1)}%`),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("checkbox", { name: "Stakes (8x)" }),
    ).not.toBeInTheDocument();
  });
});

describe("including a previously excluded item", () => {
  it("adds it back into the denominator", async () => {
    renderSection();
    const { packed, total } = packingCompletion(placeholderPackingLists);

    await openCategory("Clothing", "Rain jacket");
    fireEvent.click(screen.getByText("Not needed for this trip (1)"));
    await waitFor(() => screen.getByRole("button", { name: "Include" }));
    fireEvent.click(screen.getByRole("button", { name: "Include" }));

    await waitFor(() =>
      expect(
        screen.getByText(`${pct(packed, total + 1)}%`),
      ).toBeInTheDocument(),
    );
  });
});
