import { describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";
import { transformers } from "$/transformers";

describe("transform", () => {
  it("returns the expected shape", () => {
    const task = make("TripTask");
    expect(transformers.tripTask(task)).toEqual({
      id: task.id,
      name: task.name,
      complete: task.complete,
      phase: task.phase,
      dueDate: task.dueDate!.toISOString().slice(0, 10),
    });
  });

  it("serializes a null due date as null", () => {
    const task = { ...make("TripTask"), dueDate: null };
    expect(transformers.tripTask(task)).toMatchObject({ dueDate: null });
  });
});
