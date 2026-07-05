import TaskEditDrawer from "$/frontend/trip/tasks/task-edit-drawer";
import type { ClientTripTask } from "$/transformers/trip-task";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

function task(overrides: Partial<ClientTripTask> = {}): ClientTripTask {
  return {
    id: "task-1",
    name: "Reserve backcountry permit",
    complete: false,
    phase: "before",
    dueDate: "2026-08-13",
    ...overrides,
  };
}

const onClose = mock(() => {});

// The "Name" field is `required`, which Mantine renders as a literal " *"
// appended to the label text — so its accessible name is "Name *", not
// "Name". Match loosely instead of relying on an exact label match.
function nameInput() {
  return screen.getByRole("textbox", { name: /^Name/ });
}

function renderDrawer(t: ClientTripTask, opened = true) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <TaskEditDrawer
          task={t}
          tripId="trip-1"
          opened={opened}
          onClose={onClose}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  onClose.mockReset();
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ task: task() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
});

describe("rendering", () => {
  it("pre-fills the name field", async () => {
    renderDrawer(task({ name: "Reserve backcountry permit" }));
    expect(nameInput()).toHaveValue("Reserve backcountry permit");
    await waitFor(() => {});
  });

  it("pre-fills the phase select with the current phase label", async () => {
    renderDrawer(task({ phase: "during" }));
    expect(screen.getByRole("combobox", { name: "Phase" })).toHaveValue(
      "During the Trip",
    );
    await waitFor(() => {});
  });

  it("pre-fills the due date field", async () => {
    renderDrawer(task({ dueDate: "2026-08-13" }));
    expect(screen.getByLabelText("Due date")).toHaveValue("August 13, 2026");
    await waitFor(() => {});
  });

  it("leaves the due date field empty when there is no due date", async () => {
    renderDrawer(task({ dueDate: null }));
    expect(screen.getByLabelText("Due date")).toHaveValue("");
    await waitFor(() => {});
  });
});

function renderCreateDrawer(opened = true) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <TaskEditDrawer tripId="trip-1" opened={opened} onClose={onClose} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("creating a task", () => {
  it("renders with empty fields and no delete button", async () => {
    renderCreateDrawer();
    expect(nameInput()).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "Delete task" }),
    ).not.toBeInTheDocument();
    await waitFor(() => {});
  });

  it("calls the create API and closes the drawer", async () => {
    renderCreateDrawer();

    fireEvent.change(nameInput(), {
      target: { value: "Reserve backcountry permit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/tasks");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: "Reserve backcountry permit",
      phase: "before",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a validation error and does not submit when the name is too short", async () => {
    renderCreateDrawer();

    fireEvent.change(nameInput(), { target: { value: "ab" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(nameInput()).toBeInvalid());
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("form submission", () => {
  it("calls the update API with the edited fields and closes the drawer", async () => {
    renderDrawer(task({ id: "task-42" }));

    fireEvent.change(nameInput(), {
      target: { value: "Reserve permit early" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/tasks/task-42");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: "Reserve permit early",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a validation error and does not submit when the name is cleared", async () => {
    renderDrawer(task());

    fireEvent.change(nameInput(), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(nameInput()).toBeInvalid());
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a validation error when the name is too short", async () => {
    renderDrawer(task());

    fireEvent.change(nameInput(), {
      target: { value: "ab" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(nameInput()).toBeInvalid());
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("re-opening after the underlying task changes", () => {
  it("resyncs the form with the latest task values", async () => {
    function Wrapper({ t, opened }: { t: ClientTripTask; opened: boolean }) {
      return (
        <QueryClientProvider client={new QueryClient()}>
          <MantineProvider>
            <TaskEditDrawer
              task={t}
              tripId="trip-1"
              opened={opened}
              onClose={onClose}
            />
          </MantineProvider>
        </QueryClientProvider>
      );
    }

    const { rerender } = render(
      <Wrapper t={task({ name: "Original name" })} opened={false} />,
    );
    rerender(<Wrapper t={task({ name: "Renamed elsewhere" })} opened={true} />);

    // The Drawer's content doesn't mount synchronously after `opened` flips —
    // Mantine's Transition uses a timer. See feedback_happy_dom_quirks memory.
    await waitFor(() => expect(nameInput()).toHaveValue("Renamed elsewhere"));
  });
});

describe("deleting the task", () => {
  it("opens a confirmation modal", async () => {
    renderDrawer(task());
    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Delete task?" }),
      ).toBeInTheDocument(),
    );
  });

  it("includes the task name in the confirmation copy", async () => {
    renderDrawer(task({ name: "Reserve backcountry permit" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Delete task?" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent ===
          "Remove Reserve backcountry permit from this trip? This can't be undone.",
      ),
    ).toBeInTheDocument();
  });

  it("calls the delete API and closes both the modal and drawer on confirm", async () => {
    renderDrawer(task({ id: "task-99" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    await waitFor(() => screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/tasks/task-99");
    expect(init.method).toBe("DELETE");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call the delete API when cancelled", async () => {
    renderDrawer(task());
    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    await waitFor(() => screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
