import NoResultsState from "$/frontend/admin/user-search/search-states/no-results";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, it } from "bun:test";

function renderState(searchTerm: string) {
  return render(
    <MantineProvider>
      <NoResultsState searchTerm={searchTerm} />
    </MantineProvider>,
  );
}

it("shows the search term in the no-matches message", () => {
  const { container } = renderState("zzqxlt");
  expect(container.textContent).toContain("No accounts match");
  expect(container.textContent).toContain("zzqxlt");
});

it("suggests trying a different query", () => {
  renderState("zzqxlt");
  expect(
    screen.getByText(/Check the spelling, or try just the email domain/),
  ).toBeInTheDocument();
});
