import { paginate } from "$/transformers/pagination";
import { describe, expect, it } from "bun:test";

describe("paginate", () => {
  it("transforms each item and attaches the pagination metadata", () => {
    const result = paginate([1, 2, 3], (n) => n * 2, 10, 3);

    expect(result).toEqual({
      items: [2, 4, 6],
      total: 10,
      pageSize: 3,
    });
  });

  it("handles an empty page", () => {
    const result = paginate([], (n: number) => n, 0, 3);

    expect(result).toEqual({
      items: [],
      total: 0,
      pageSize: 3,
    });
  });
});
