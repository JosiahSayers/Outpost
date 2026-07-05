import Tasks from "$/frontend/trip/tasks";
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

function renderTasks(
  tasks: ClientTripTask[],
  tripStart: string | null = null,
  tripEnd: string | null = null,
) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <Tasks
          tripId="trip-1"
          tasks={tasks}
          tripStart={tripStart}
          tripEnd={tripEnd}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

function activeStep(label: string) {
  return screen.getByText(label).closest("button");
}

describe("header", () => {
  it("renders the completed/total count", () => {
    renderTasks([
      task({ complete: true }),
      task({ complete: false }),
      task({ complete: false }),
    ]);
    expect(screen.getByText("1/3 complete")).toBeInTheDocument();
  });

  it("renders each phase's own done count in its step description", () => {
    renderTasks([
      task({ phase: "before", complete: true }),
      task({ phase: "before", complete: false }),
      task({ phase: "during", complete: true }),
    ]);
    expect(screen.getByText("1/2 done")).toBeInTheDocument();
    expect(screen.getByText("1/1 done")).toBeInTheDocument();
    expect(screen.getByText("0/0 done")).toBeInTheDocument();
  });
});

describe("active phase (no tasks, no dates)", () => {
  it("defaults to the first phase", () => {
    renderTasks([]);
    expect(activeStep("Before the Trip")).toHaveAttribute("data-progress");
    expect(activeStep("During the Trip")).not.toHaveAttribute("data-progress");
  });
});

describe("active phase from task completion", () => {
  it("advances to During once all before-tasks are complete", () => {
    renderTasks([
      task({ phase: "before", complete: true }),
      task({ phase: "before", complete: true }),
      task({ phase: "during", complete: false }),
    ]);
    expect(activeStep("During the Trip")).toHaveAttribute("data-progress");
  });

  it("stays on Before while any before-task is incomplete", () => {
    renderTasks([
      task({ phase: "before", complete: true }),
      task({ phase: "before", complete: false }),
    ]);
    expect(activeStep("Before the Trip")).toHaveAttribute("data-progress");
  });

  it("advances to After once before and during tasks are both complete", () => {
    renderTasks([
      task({ phase: "before", complete: true }),
      task({ phase: "during", complete: true }),
    ]);
    expect(activeStep("After the Trip")).toHaveAttribute("data-progress");
  });

  it("does not advance past Before when there are no during-tasks to complete", () => {
    renderTasks([task({ phase: "before", complete: true })]);
    expect(activeStep("During the Trip")).toHaveAttribute("data-progress");
    expect(activeStep("After the Trip")).not.toHaveAttribute("data-progress");
  });
});

describe("active phase from trip dates", () => {
  it("advances to During once the trip start date has passed, regardless of tasks", () => {
    renderTasks([task({ phase: "before", complete: false })], "2000-01-01");
    expect(activeStep("During the Trip")).toHaveAttribute("data-progress");
  });

  it("does not advance before the trip start date", () => {
    renderTasks([], "2999-01-01");
    expect(activeStep("Before the Trip")).toHaveAttribute("data-progress");
  });

  it("advances to After once the trip end date has passed", () => {
    renderTasks([], "2000-01-01", "2000-01-02");
    expect(activeStep("After the Trip")).toHaveAttribute("data-progress");
  });

  it("takes whichever signal (tasks or dates) is furthest along", () => {
    // Trip hasn't started, but every before/during task is already done —
    // task completion should still push the stepper to After.
    renderTasks(
      [
        task({ phase: "before", complete: true }),
        task({ phase: "during", complete: true }),
      ],
      "2999-01-01",
    );
    expect(activeStep("After the Trip")).toHaveAttribute("data-progress");
  });
});

describe("task list rendering", () => {
  it("renders the desktop TaskList by default (narrow media query not matched)", () => {
    renderTasks([task({ name: "Reserve permit" })]);
    expect(screen.getByText("Reserve permit")).toBeInTheDocument();
  });
});
