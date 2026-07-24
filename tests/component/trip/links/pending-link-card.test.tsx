import PendingLinkCard from "$/frontend/trip/links/pending-link-card";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function renderCard(url: string) {
  render(
    <MantineProvider>
      <PendingLinkCard url={url} />
    </MantineProvider>,
  );
}

describe("PendingLinkCard", () => {
  it("renders the hostname of the known url while the rest is loading", () => {
    renderCard("https://www.nps.gov/mora/index.htm");
    expect(screen.getByText("nps.gov")).toBeInTheDocument();
  });

  it("falls back to the raw url when it can't be parsed", () => {
    renderCard("not a url");
    expect(screen.getByText("not a url")).toBeInTheDocument();
  });
});
