import LocationCell from "$/frontend/admin/user-sessions/location-cell";
import type { ClientIpLocation } from "$/transformers/ip-location";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function makeLocation(
  overrides: Partial<ClientIpLocation> = {},
): ClientIpLocation {
  return {
    city: "Portland",
    country: "United States",
    subdivisions: ["Oregon"],
    ...overrides,
  };
}

function renderCell(location?: ClientIpLocation | null) {
  render(
    <MantineProvider>
      <LocationCell location={location} />
    </MantineProvider>,
  );
}

describe("a full location", () => {
  it("shows city, subdivision, and country", () => {
    renderCell(makeLocation());

    expect(
      screen.getByText("Portland, Oregon, United States"),
    ).toBeInTheDocument();
  });
});

describe("a location missing some fields", () => {
  it("omits a missing city", () => {
    renderCell(makeLocation({ city: null }));

    expect(screen.getByText("Oregon, United States")).toBeInTheDocument();
  });

  it("omits a missing subdivision", () => {
    renderCell(makeLocation({ subdivisions: [] }));

    expect(screen.getByText("Portland, United States")).toBeInTheDocument();
  });

  it("shows just the country when only the country is known", () => {
    renderCell({ city: null, country: "United States", subdivisions: [] });

    expect(screen.getByText("United States")).toBeInTheDocument();
  });
});

describe("no location data", () => {
  it("shows a dash when the location is null", () => {
    renderCell(null);

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows a dash when the location is undefined", () => {
    renderCell(undefined);

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows a dash when city, country, and subdivisions are all empty", () => {
    renderCell({ city: null, country: null, subdivisions: [] });

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
