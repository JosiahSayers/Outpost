import ItemDrawer, {
  type ItemDrawerTarget,
} from "$/frontend/packing-list/section/item-drawer";
import { gearInventoryKeys } from "$/frontend/utils/api/gear-inventory";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function gear(
  overrides: Partial<ClientGearInventoryItem> = {},
): ClientGearInventoryItem {
  return {
    id: "gear-1",
    name: "Trekking poles",
    quantity: 1,
    grams: 500,
    category: { id: "cat-1", name: "Trekking", public: false },
    ...overrides,
  };
}

function item(
  overrides: Partial<ClientPackingListItem> = {},
): ClientPackingListItem {
  return {
    id: "item-1",
    name: "Tent",
    optional: false,
    quantity: 1,
    sortPosition: 2,
    trackGearAssignment: true,
    assignedGear: null,
    category: null,
    ...overrides,
  };
}

// The API only wants `assignedGearId`, but `updateItem`/`createItem` respond
// with a full item so the mock has to shape its response like the real
// routes do.
function mockFetch({
  createStatus = 201,
  updateStatus = 200,
}: { createStatus?: number; updateStatus?: number } = {}) {
  const jsonHeaders = { "Content-Type": "application/json" };
  const fetchMock = mock((url: string, init?: RequestInit) => {
    const method = init?.method;
    const body = init?.body ? JSON.parse(init.body as string) : {};

    if (method === "POST") {
      if (createStatus >= 400) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Couldn't create item" }), {
            status: createStatus,
            headers: jsonHeaders,
          }),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            item: { id: "new-item", ...body, assignedGear: null },
          }),
          { status: createStatus, headers: jsonHeaders },
        ),
      );
    }

    if (method === "PATCH") {
      if (updateStatus >= 400) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Couldn't update item" }), {
            status: updateStatus,
            headers: jsonHeaders,
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ item: { id: "item-1", ...body } }), {
          status: updateStatus,
          headers: jsonHeaders,
        }),
      );
    }

    throw new Error(`Unexpected fetch: ${method} ${url}`);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function jsonBody(fetchMock: ReturnType<typeof mock>, callIndex = 0) {
  const [, init] = fetchMock.mock.calls[callIndex] as [string, RequestInit];
  return JSON.parse(init.body as string);
}

function renderDrawer({
  target,
  onClose = () => {},
  onDelete = () => {},
  inventoryItems = [gear()],
}: {
  target: ItemDrawerTarget;
  onClose?: () => void;
  onDelete?: () => void;
  inventoryItems?: ClientGearInventoryItem[];
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  queryClient.setQueryData(gearInventoryKeys.all, { items: inventoryItems });

  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <ItemDrawer
          listId="list-1"
          opened
          target={target}
          onClose={onClose}
          onDelete={onDelete}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("editing an existing item", () => {
  it("shows the item's current name and quantity", () => {
    renderDrawer({
      target: {
        sectionId: "section-1",
        item: item({ name: "Headlamp", quantity: 2 }),
      },
    });

    expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue(
      "Headlamp",
    );
    expect(screen.getByRole("textbox", { name: /quantity/i })).toHaveValue("2");
  });

  it("disables Save and shows an error when the name is too short", () => {
    renderDrawer({ target: { sectionId: "section-1", item: item() } });

    fireEvent.change(screen.getByRole("textbox", { name: /name/i }), {
      target: { value: "ab" },
    });

    expect(screen.getByText("Use at least 3 characters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves name and gear changes in a single request, then closes", async () => {
    const fetchMock = mockFetch();
    const onClose = mock(() => {});
    renderDrawer({
      target: { sectionId: "section-1", item: item() },
      onClose,
    });

    fireEvent.change(screen.getByRole("textbox", { name: /name/i }), {
      target: { value: "Tent (renamed)" },
    });
    fireEvent.click(screen.getByText("Trekking poles"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "/api/packing-lists/list-1/sections/section-1/items/item-1",
    );
    expect(init.method).toBe("PATCH");
    expect(jsonBody(fetchMock)).toMatchObject({
      name: "Tent (renamed)",
      quantity: 1,
      assignedGearId: "gear-1",
      trackGearAssignment: true,
      sortPosition: 2,
    });
  });

  it("stops tracking gear and clears any assignment in the same request", async () => {
    const fetchMock = mockFetch();
    renderDrawer({
      target: {
        sectionId: "section-1",
        item: item({ assignedGear: gear() }),
      },
    });

    fireEvent.click(screen.getByText("Remove gear and stop tracking"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(jsonBody(fetchMock)).toMatchObject({
      assignedGearId: null,
      trackGearAssignment: false,
    });
  });

  it("keeps the drawer open with the entered name when saving fails", async () => {
    const fetchMock = mockFetch({ updateStatus: 500 });
    const onClose = mock(() => {});
    renderDrawer({
      target: { sectionId: "section-1", item: item() },
      onClose,
    });

    fireEvent.change(screen.getByRole("textbox", { name: /name/i }), {
      target: { value: "Tent (renamed)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue(
      "Tent (renamed)",
    );
  });
});

describe("adding a new item", () => {
  function newTarget(overrides: Partial<ClientPackingListItem> = {}) {
    return {
      sectionId: "section-1",
      item: item({
        id: "draft-1",
        name: "New item",
        sortPosition: 0,
        ...overrides,
      }),
      isNew: true,
    } satisfies ItemDrawerTarget;
  }

  it("creates the item with name, gear and tracking in a single request, then closes", async () => {
    const fetchMock = mockFetch();
    const onClose = mock(() => {});
    renderDrawer({ target: newTarget(), onClose });

    fireEvent.change(screen.getByRole("textbox", { name: /name/i }), {
      target: { value: "Headlamp" },
    });
    fireEvent.click(screen.getByText("Trekking poles"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/packing-lists/list-1/sections/section-1/items");
    expect(init.method).toBe("POST");
    expect(jsonBody(fetchMock)).toMatchObject({
      name: "Headlamp",
      quantity: 1,
      assignedGearId: "gear-1",
      trackGearAssignment: true,
    });
  });

  it("keeps the drawer open with the entered data when creation fails", async () => {
    const fetchMock = mockFetch({ createStatus: 400 });
    const onClose = mock(() => {});
    renderDrawer({ target: newTarget(), onClose });

    fireEvent.change(screen.getByRole("textbox", { name: /name/i }), {
      target: { value: "Headlamp" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue(
      "Headlamp",
    );
  });
});

describe("deleting an item", () => {
  it("confirms, then removes the item and closes the drawer", async () => {
    const onDelete = mock(() => {});
    const onClose = mock(() => {});
    const target = { sectionId: "section-1", item: item() };
    renderDrawer({ target, onClose, onDelete });

    fireEvent.click(screen.getByRole("button", { name: "Delete item" }));
    await waitFor(() => screen.getByText("Delete item?"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith("section-1", target.item);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
