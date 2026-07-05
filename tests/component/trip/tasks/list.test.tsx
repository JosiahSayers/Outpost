import TaskList from "$/frontend/trip/tasks/list";
import type { ClientTripTask } from "$/transformers/trip-task";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function task(overrides: Partial<ClientTripTask> = {}): ClientTripTask {
  return {
    id: crypto.randomUUID(),
    name: "Task",
    complete: false,
    phase: "before",
    dueDate: null,
    ...overrides,
  };
}

function renderList(tasks: ClientTripTask[]) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <TaskList tripId="trip-1" tasks={tasks} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("TaskList", () => {
  it("groups tasks under their phase column", () => {
    renderList([
      task({ name: "Reserve permit", phase: "before" }),
      task({ name: "Check in at ranger station", phase: "during" }),
      task({ name: "Post trip report", phase: "after" }),
    ]);

    expect(screen.getByText("Reserve permit")).toBeInTheDocument();
    expect(screen.getByText("Check in at ranger station")).toBeInTheDocument();
    expect(screen.getByText("Post trip report")).toBeInTheDocument();
  });

  it("only renders tasks belonging to their own phase", () => {
    renderList([task({ name: "Only before task", phase: "before" })]);

    expect(screen.getByText("Only before task")).toBeInTheDocument();
    expect(screen.queryByText("Only during task")).not.toBeInTheDocument();
  });

  it("renders nothing extra when there are no tasks", () => {
    renderList([]);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
