import MobileTaskList from "$/frontend/trip/tasks/mobile-list";
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
        <MobileTaskList tripId="trip-1" tasks={tasks} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("MobileTaskList", () => {
  it("renders an uppercase phase heading for every phase", () => {
    renderList([]);

    expect(screen.getByText("Before the Trip")).toBeInTheDocument();
    expect(screen.getByText("During the Trip")).toBeInTheDocument();
    expect(screen.getByText("After the Trip")).toBeInTheDocument();
  });

  it("lists each task under its own phase heading", () => {
    renderList([
      task({ name: "Reserve permit", phase: "before" }),
      task({ name: "Resupply at Sunrise camp", phase: "during" }),
    ]);

    expect(screen.getByText("Reserve permit")).toBeInTheDocument();
    expect(screen.getByText("Resupply at Sunrise camp")).toBeInTheDocument();
  });
});
