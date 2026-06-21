import Highlights from "$/frontend/marketing/highlights";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "bun:test";

beforeEach(() => {
  render(
    <MantineProvider>
      <Highlights />
    </MantineProvider>,
  );
});

it("renders the section heading", () => {
  expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
    "Everything your trip needs, in one place",
  );
});

it("renders the section copy", () => {
  expect(
    screen.getByText(
      "From the gear room to the trailhead, Summit Journal covers the planning side so you can focus on the miles.",
    ),
  ).toBeInTheDocument();
});

it("renders the Gear feature card", () => {
  expect(
    screen.getByRole("heading", { level: 3, name: "Your kit, catalogued" }),
  ).toBeInTheDocument();
});

it("renders the Lists feature card", () => {
  expect(
    screen.getByRole("heading", { level: 3, name: "Pack lists that actually fit" }),
  ).toBeInTheDocument();
});

it("renders the Trips feature card", () => {
  expect(
    screen.getByRole("heading", { level: 3, name: "Share where you're headed" }),
  ).toBeInTheDocument();
});
