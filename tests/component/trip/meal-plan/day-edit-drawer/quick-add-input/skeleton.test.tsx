import SearchSkeleton from "$/frontend/trip/meal-plan/day-edit-drawer/quick-add-input/skeleton";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { expect, it } from "bun:test";

it("renders three placeholder rows", () => {
  render(
    <MantineProvider>
      <SearchSkeleton />
    </MantineProvider>,
  );

  // 3 rows x (name + badge + 3 stat cells) = 15 skeleton placeholders
  expect(document.querySelectorAll(".mantine-Skeleton-root")).toHaveLength(15);
});
