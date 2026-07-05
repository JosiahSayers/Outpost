import TaskListItem from "$/frontend/trip/tasks/task-list-item";
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
    dueDate: null,
    ...overrides,
  };
}

function renderItem(t: ClientTripTask) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <TaskListItem task={t} tripId="trip-1" />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
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
  it("renders the task name", () => {
    renderItem(task({ name: "Buy fuel canisters" }));
    expect(screen.getByText("Buy fuel canisters")).toBeInTheDocument();
  });

  it("renders an unchecked checkbox for an incomplete task", () => {
    renderItem(task({ complete: false }));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("renders a checked checkbox for a complete task", () => {
    renderItem(task({ complete: true }));
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("strikes through and dims the name when complete", () => {
    renderItem(task({ name: "Buy fuel canisters", complete: true }));
    expect(screen.getByText("Buy fuel canisters")).toHaveStyle({
      textDecoration: "line-through",
    });
  });

  it("renders the due date formatted in UTC when present", () => {
    renderItem(task({ dueDate: "2026-08-13" }));
    expect(screen.getByText("Due Aug 13")).toBeInTheDocument();
  });

  it("renders no due date text when dueDate is null", () => {
    renderItem(task({ dueDate: null }));
    expect(screen.queryByText(/^Due /)).not.toBeInTheDocument();
  });
});

describe("toggling the checkbox", () => {
  it("calls the update API with the task id and new completion state", async () => {
    renderItem(task({ id: "task-42", complete: false }));
    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/tasks/task-42");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ complete: true });
  });

  it("does not open the edit drawer", () => {
    renderItem(task());
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.queryByText("Edit task")).not.toBeInTheDocument();
  });
});

describe("clicking the row", () => {
  it("opens the edit drawer", async () => {
    renderItem(task({ name: "Buy fuel canisters" }));
    fireEvent.click(screen.getByText("Buy fuel canisters"));
    await waitFor(() =>
      expect(screen.getByText("Edit task")).toBeInTheDocument(),
    );
  });
});
