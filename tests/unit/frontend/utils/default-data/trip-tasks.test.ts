import { describe, expect, it } from "bun:test";
import { prepareDefaultTripTasks } from "$/frontend/utils/default-data/trip-tasks";

describe("prepareDefaultTripTasks", () => {
  it("generates the expected set of tasks with phases", () => {
    const tasks = prepareDefaultTripTasks({ name: "Appalachian Trail" });

    expect(
      tasks.map((task) => ({ name: task.name, phase: task.phase })),
    ).toEqual([
      {
        name: "Share trip plan with emergency contact",
        phase: "before",
      },
      { name: "Check weather forecast", phase: "before" },
      { name: "Pack backpack", phase: "before" },
      { name: "Leave copy of trip plan in vehicle", phase: "during" },
      { name: "Post trip report", phase: "after" },
      { name: "Unpack", phase: "after" },
    ]);
  });

  it("sets before-phase due dates relative to the trip start date", () => {
    const tasks = prepareDefaultTripTasks({
      name: "Appalachian Trail",
      start: new Date("2026-06-10"),
    });

    const dueDatesByName = Object.fromEntries(
      tasks.map((task) => [task.name, task.dueDate]),
    );

    expect(dueDatesByName["Share trip plan with emergency contact"]).toEqual(
      new Date("2026-06-08"),
    );
    expect(dueDatesByName["Check weather forecast"]).toEqual(
      new Date("2026-06-08"),
    );
    expect(dueDatesByName["Pack backpack"]).toEqual(new Date("2026-06-09"));
  });

  it("leaves before-phase due dates unset when there is no start date", () => {
    const tasks = prepareDefaultTripTasks({ name: "Appalachian Trail" });

    const beforeTasks = tasks.filter((task) => task.phase === "before");
    expect(beforeTasks.every((task) => !task.dueDate)).toBe(true);
  });

  it("does not set due dates for during/after tasks", () => {
    const tasks = prepareDefaultTripTasks({
      name: "Appalachian Trail",
      start: new Date("2026-06-10"),
    });

    const nonBeforeTasks = tasks.filter((task) => task.phase !== "before");
    expect(nonBeforeTasks.every((task) => task.dueDate === undefined)).toBe(
      true,
    );
  });
});
