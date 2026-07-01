import PackingLists from "$/frontend/dashboard/packing-lists";
import { packingListKeys } from "$/frontend/utils/api/packing-list";
import type { ClientPackingList } from "$/transformers/packing-list";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { Router } from "wouter";

function renderComponent(lists: ClientPackingList[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(packingListKeys.all(), lists);
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Router hook={() => ["/dashboard", () => {}]}>
          <PackingLists />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("while loading", () => {
  beforeEach(() => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.prefetchQuery({
      queryKey: packingListKeys.all(),
      queryFn: () => new Promise<ClientPackingList[]>(() => {}),
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <Router hook={() => ["/dashboard", () => {}]}>
            <PackingLists />
          </Router>
        </MantineProvider>
      </QueryClientProvider>,
    );
  });

  it("renders the section heading", () => {
    expect(
      screen.getByRole("heading", { level: 2, name: "My Packing Lists" }),
    ).toBeInTheDocument();
  });

  it("does not render the empty state message", () => {
    expect(
      screen.queryByText(
        "No Packing lists yet. Create one to get started planning.",
      ),
    ).not.toBeInTheDocument();
  });

  it("does not render list cards", () => {
    expect(
      screen.queryByRole("link", { name: "Export PDF" }),
    ).not.toBeInTheDocument();
  });
});

describe("when there are no lists", () => {
  beforeEach(() => renderComponent([]));

  it("renders the section heading", () => {
    expect(
      screen.getByRole("heading", { level: 2, name: "My Packing Lists" }),
    ).toBeInTheDocument();
  });

  it("renders the empty state message", () => {
    expect(
      screen.getByText(
        "No Packing lists yet. Create one to get started planning.",
      ),
    ).toBeInTheDocument();
  });

  it("renders a 'New List' button", () => {
    expect(
      screen.getByRole("button", { name: "New List" }),
    ).toBeInTheDocument();
  });

  it("does not render the 'View all lists' button", () => {
    expect(
      screen.queryByRole("button", { name: "View all lists" }),
    ).not.toBeInTheDocument();
  });
});

describe("when there are 3 or fewer lists", () => {
  const lists: ClientPackingList[] = [
    { id: 1, name: "Weekend Kit", totalItems: 18, totalUniqueItems: 18 },
    { id: 2, name: "Emergency Bag", totalItems: 12, totalUniqueItems: 16 },
  ] as any;

  beforeEach(() => renderComponent(lists));

  it("renders a card for each list", () => {
    expect(screen.getAllByRole("link", { name: "Export PDF" })).toHaveLength(2);
  });

  it("does not render the 'View all lists' button", () => {
    expect(
      screen.queryByRole("button", { name: "View all lists" }),
    ).not.toBeInTheDocument();
  });
});

describe("when there are more than 3 lists", () => {
  const lists: ClientPackingList[] = [
    { id: 1, name: "Weekend Kit", totalItems: 18, totalUniqueItems: 18 },
    { id: 2, name: "Emergency Bag", totalItems: 12, totalUniqueItems: 16 },
    { id: 3, name: "Summer Trip", totalItems: 10, totalUniqueItems: 10 },
    { id: 4, name: "Winter Hike", totalItems: 22, totalUniqueItems: 22 },
  ] as any;

  beforeEach(() => renderComponent(lists));

  it("renders only the first 3 lists initially", () => {
    expect(screen.getAllByRole("link", { name: "Export PDF" })).toHaveLength(3);
  });

  it("renders the 'View all lists' button", () => {
    expect(
      screen.getByRole("button", { name: "View all lists" }),
    ).toBeInTheDocument();
  });

  it("shows all list cards after clicking 'View all lists'", async () => {
    fireEvent.click(screen.getByRole("button", { name: "View all lists" }));
    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: "Export PDF" })).toHaveLength(
        4,
      ),
    );
  });

  it("changes button text to 'View less' after clicking 'View all lists'", () => {
    fireEvent.click(screen.getByRole("button", { name: "View all lists" }));
    expect(
      screen.getByRole("button", { name: "View less" }),
    ).toBeInTheDocument();
  });

  it("collapses back to 3 cards after clicking 'View less'", async () => {
    fireEvent.click(screen.getByRole("button", { name: "View all lists" }));
    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: "Export PDF" })).toHaveLength(
        4,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "View less" }));
    expect(screen.getAllByRole("link", { name: "Export PDF" })).toHaveLength(3);
  });

  it("changes button text back to 'View all lists' after clicking 'View less'", () => {
    fireEvent.click(screen.getByRole("button", { name: "View all lists" }));
    fireEvent.click(screen.getByRole("button", { name: "View less" }));
    expect(
      screen.getByRole("button", { name: "View all lists" }),
    ).toBeInTheDocument();
  });
});
