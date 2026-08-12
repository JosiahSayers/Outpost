import { drawTasksSection } from "$/utils/pdf/trip-summary/tasks-section";
import { describe, expect, it } from "bun:test";
import { makeTestDocument, pageCount } from "../../../../helpers/pdf";

function task(
  overrides: Partial<{
    name: string;
    complete: boolean;
    phase: "before" | "during" | "after";
  }> = {},
) {
  return {
    name: "Reserve permits",
    complete: false,
    phase: "before" as const,
    ...overrides,
  };
}

describe("drawTasksSection", () => {
  it("draws nothing at all when there are no tasks", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawTasksSection(document, [], { blank: false });
    expect(document.y).toBe(before);
    expect(pageCount(document)).toBe(1);
  });

  it("renders tasks across all three phases without throwing", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawTasksSection(
      document,
      [
        task({ name: "Reserve permits", phase: "before", complete: true }),
        task({ name: "Check weather", phase: "during" }),
        task({ name: "Clean gear", phase: "after" }),
      ],
      { blank: false },
    );
    expect(document.y).toBeGreaterThan(before);
    expect(pageCount(document)).toBe(1);
  });

  it("renders without throwing when blank is true", () => {
    const document = makeTestDocument();
    expect(() =>
      drawTasksSection(
        document,
        [task({ complete: true }), task({ complete: false })],
        { blank: true },
      ),
    ).not.toThrow();
  });

  it("paginates across multiple pages once tasks overflow a single page", () => {
    const document = makeTestDocument();
    const tasks = Array.from({ length: 150 }, (_, i) =>
      task({ name: `Task number ${i}`, phase: "before" }),
    );

    drawTasksSection(document, tasks, { blank: false });

    expect(pageCount(document)).toBeGreaterThan(1);
  });

  it("only draws phases that actually have tasks", () => {
    const document = makeTestDocument();
    expect(() =>
      drawTasksSection(document, [task({ phase: "during" })], {
        blank: false,
      }),
    ).not.toThrow();
    expect(pageCount(document)).toBe(1);
  });
});
