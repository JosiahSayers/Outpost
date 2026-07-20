import LoadingState from "$/frontend/admin/user-search/search-states/loading";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { expect, it } from "bun:test";

it("renders a loader", () => {
  render(
    <MantineProvider>
      <LoadingState />
    </MantineProvider>,
  );
  expect(document.querySelector(".mantine-Loader-root")).toBeInTheDocument();
});
