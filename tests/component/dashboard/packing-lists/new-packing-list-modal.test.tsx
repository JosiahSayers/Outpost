import NewPackingListModal from "$/frontend/dashboard/packing-lists/new-packing-list-modal";
import { packingListKeys } from "$/frontend/utils/api/packing-list";
import type { ClientPackingList } from "$/transformers/packing-list";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

const onClose = mock(() => {});
const navigate = mock((_path: string, _opts?: unknown) => {});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderModal({
  useNavigateMock = false,
  queryClient,
}: { useNavigateMock?: boolean; queryClient?: QueryClient } = {}) {
  const client = queryClient ?? makeQueryClient();
  render(
    <QueryClientProvider client={client}>
      <MantineProvider>
        <Router
          hook={() => [
            "/dashboard",
            useNavigateMock ? (navigate as any) : () => {},
          ]}
        >
          <NewPackingListModal opened={true} onClose={onClose} />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
  return client;
}

beforeEach(() => {
  onClose.mockReset();
  navigate.mockReset();
});

describe("when opened", () => {
  beforeEach(() => renderModal());

  it("renders the modal title", () => {
    expect(screen.getByText("New Packing List")).toBeInTheDocument();
  });

  it("renders the description", () => {
    expect(
      screen.getByText(
        "Give your new list a name. Optionally, copy the sections and items from an existing list to use as a starting point.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the List name input", () => {
    expect(
      screen.getByRole("textbox", { name: "List name" }),
    ).toBeInTheDocument();
  });

  it("renders the Copy from existing list input", () => {
    expect(
      screen.getByLabelText("Copy from existing list"),
    ).toBeInTheDocument();
  });

  it("renders a Cancel button", () => {
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders a Create list button", () => {
    expect(
      screen.getByRole("button", { name: "Create list" }),
    ).toBeInTheDocument();
  });
});

describe("when opened is false", () => {
  it("does not render modal content", () => {
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <MantineProvider>
          <Router hook={() => ["/dashboard", () => {}]}>
            <NewPackingListModal opened={false} onClose={onClose} />
          </Router>
        </MantineProvider>
      </QueryClientProvider>,
    );
    expect(screen.queryByText("New Packing List")).not.toBeInTheDocument();
  });
});

describe("clicking Cancel", () => {
  beforeEach(() => renderModal());

  it("calls onClose", () => {
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("form validation", () => {
  beforeEach(() => {
    global.fetch = mock(() =>
      Promise.resolve(new Response("{}", { status: 200 })),
    ) as unknown as typeof fetch;
    renderModal();
  });

  it("shows an error when name is empty and form is submitted", async () => {
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "List name" })).toBeInvalid(),
    );
  });

  it("does not call the API when name is empty", () => {
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows an error when name is fewer than 3 characters", async () => {
    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "AB" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "List name" })).toBeInvalid(),
    );
  });

  it("does not call the API when name is fewer than 3 characters", () => {
    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "AB" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("successful submission", () => {
  beforeEach(() => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ packingList: { id: 42, name: "Weekend Kit" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    ) as unknown as typeof fetch;
  });

  it("calls the API with the list name", async () => {
    renderModal();
    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "Weekend Kit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: "Weekend Kit",
    });
  });

  it("navigates to the new packing list", async () => {
    renderModal({ useNavigateMock: true });
    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "Weekend Kit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    await waitFor(() =>
      expect(navigate.mock.calls[0]?.[0]).toBe("/packing-lists/42"),
    );
  });
});

describe("when creation fails", () => {
  beforeEach(() => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(null, {
          status: 500,
          statusText: "Internal Server Error",
        }),
      ),
    ) as unknown as typeof fetch;
    renderModal({ useNavigateMock: true });
  });

  it("shows the error message", async () => {
    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "Weekend Kit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    await waitFor(() =>
      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument(),
    );
  });

  it("does not navigate", async () => {
    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "Weekend Kit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    await waitFor(() =>
      screen.getByText("Something went wrong. Please try again."),
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("copy from existing list search", () => {
  const searchResults: Partial<ClientPackingList>[] = [
    { id: 1, name: "Weekend Kit" },
    { id: 2, name: "Weekend Warrior" },
  ];

  function renderWithSearchData(query: string) {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(packingListKeys.search(query), searchResults);
    renderModal({ queryClient });
    return queryClient;
  }

  it("shows matching lists in the dropdown after typing", async () => {
    renderWithSearchData("Week");

    const searchInput = screen.getByLabelText("Copy from existing list");
    fireEvent.change(searchInput, { target: { value: "Week" } });

    await waitFor(() => {
      expect(screen.getByText("Weekend Kit")).toBeInTheDocument();
      expect(screen.getByText("Weekend Warrior")).toBeInTheDocument();
    });
  });

  it("populates the input when a result is selected", async () => {
    renderWithSearchData("Week");

    const searchInput = screen.getByLabelText("Copy from existing list");
    fireEvent.change(searchInput, { target: { value: "Week" } });

    await waitFor(() => screen.getByText("Weekend Kit"));
    fireEvent.click(screen.getByText("Weekend Kit"));

    expect(searchInput).toHaveValue("Weekend Kit");
  });

  it("includes copiedFromPackingListId in the API call when a source is selected", async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ packingList: { id: 99, name: "Emergency Bag" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    ) as unknown as typeof fetch;

    renderWithSearchData("Week");

    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "Emergency Bag" },
    });

    const searchInput = screen.getByLabelText("Copy from existing list");
    fireEvent.change(searchInput, { target: { value: "Week" } });

    await waitFor(() => screen.getByText("Weekend Kit"));
    fireEvent.click(screen.getByText("Weekend Kit"));

    fireEvent.click(screen.getByRole("button", { name: "Create list" }));

    await waitFor(() => {
      const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
      const [, init] = fetchMock.mock.calls[0]!;
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({ copiedFromPackingListId: 1 });
    });
  });
});
