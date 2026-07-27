import ProgressOverview from "$/frontend/trip/packing-lists/progress-overview";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

interface Props {
  packed: number;
  total: number;
  packingListName: string;
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
});
