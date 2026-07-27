import ProgressOverview from "$/frontend/trip/packing-lists/progress-overview";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

interface Props {
  packed: number;
  total: number;
  packingListName?: string;
  purchased?: number;
  purchasedTotal?: number;
}

function renderOverview(overrides: Partial<Props> = {}) {
  const props: Props = {
    packed: 18,
    total: 32,
    packingListName: "Wonderland Backpacking Kit",
    ...overrides,
  };
  return render(
    <MantineProvider>
      <ProgressOverview {...props} />
    </MantineProvider>,
  );
}

describe("percentage label", () => {
  it("renders the rounded packed percentage", () => {
    renderOverview({ packed: 18, total: 32 });
    expect(screen.getByText("56%")).toBeInTheDocument();
  });

  it("rounds to the nearest whole percent", () => {
    renderOverview({ packed: 1, total: 3 });
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("renders 0% rather than dividing by zero when total is 0", () => {
    renderOverview({ packed: 0, total: 0 });
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders 100% when everything is packed", () => {
    renderOverview({ packed: 12, total: 12 });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});

describe("summary text", () => {
  it("renders the packed/total count", () => {
    renderOverview({ packed: 5, total: 10 });
    expect(screen.getByText("5/10 packed")).toBeInTheDocument();
  });

  it("renders the assigned packing list's name", () => {
    renderOverview({ packingListName: "Alpine Kit" });
    expect(screen.getByText("Alpine Kit")).toBeInTheDocument();
  });

  it("omits the name line when no list is assigned", () => {
    renderOverview({ packingListName: undefined });
    expect(screen.queryByText("Alpine Kit")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Wonderland Backpacking Kit"),
    ).not.toBeInTheDocument();
  });
});

describe("purchased segment", () => {
  it("is omitted when purchasedTotal is not provided", () => {
    renderOverview({ purchased: undefined, purchasedTotal: undefined });
    expect(screen.queryByText(/purchased/)).not.toBeInTheDocument();
  });

  it("is omitted when purchasedTotal is 0", () => {
    renderOverview({ purchased: 0, purchasedTotal: 0 });
    expect(screen.queryByText(/purchased/)).not.toBeInTheDocument();
  });

  it("renders the purchased/purchasedTotal count when provided", () => {
    renderOverview({ purchased: 3, purchasedTotal: 4 });
    expect(screen.getByText("3/4 purchased")).toBeInTheDocument();
  });
});
