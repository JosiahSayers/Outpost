import PreSearchState from "$/frontend/admin/user-search/search-states/pre-search";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, it } from "bun:test";

function renderState() {
  render(
    <MantineProvider>
      <PreSearchState />
    </MantineProvider>,
  );
}

it("prompts the admin to search", () => {
  renderState();
  expect(screen.getByText("Find an account")).toBeInTheDocument();
});

it("explains how results are found", () => {
  renderState();
  expect(
    screen.getByText(/Start typing a name or email above/),
  ).toBeInTheDocument();
});
