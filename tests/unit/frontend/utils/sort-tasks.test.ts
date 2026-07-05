import { sortTasks } from "$/frontend/utils/sort-tasks";
import { describe, expect, it } from "bun:test";

interface Task {
  id: string;
  complete: boolean;
  dueDate: string | null;
}

function task(id: string, complete: boolean, dueDate: string | null): Task {
  return { id, complete, dueDate };
}

describe("sortTasks", () => {
  it("puts completed tasks before incomplete tasks", () => {
    const tasks = [
      task("a", false, null),
      task("b", true, null),
      task("c", false, null),
      task("d", true, null),
    ];

    expect(sortTasks(tasks).map((t) => t.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("orders tasks within the same completion group by due date ascending", () => {
    const tasks = [
      task("a", false, "2026-08-13"),
      task("b", false, "2026-08-10"),
      task("c", false, "2026-08-11"),
    ];

    expect(sortTasks(tasks).map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("appends undated tasks to the end of their completion group", () => {
    const tasks = [
      task("a", false, null),
      task("b", false, "2026-08-10"),
      task("c", false, null),
      task("d", false, "2026-08-11"),
    ];

    expect(sortTasks(tasks).map((t) => t.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("sorts due dates within the completed group too", () => {
    const tasks = [
      task("a", true, "2026-08-13"),
      task("b", true, "2026-08-10"),
      task("c", false, "2026-08-01"),
    ];

    expect(sortTasks(tasks).map((t) => t.id)).toEqual(["b", "a", "c"]);
  });

  it("does not mutate the input array", () => {
    const tasks = [task("a", false, null), task("b", true, null)];
    const original = [...tasks];

    sortTasks(tasks);

    expect(tasks).toEqual(original);
  });

  it("returns an empty array for empty input", () => {
    expect(sortTasks([])).toEqual([]);
  });
});
