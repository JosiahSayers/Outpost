import Highlight, { type Feature } from "$/frontend/marketing/highlight";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "bun:test";

const feature: Feature = {
  label: "Gear",
  title: "Your kit, catalogued",
  description:
    "Build a personal inventory of everything you own. Weight, category, condition; it's all there when you need it. No more wondering if you packed the rain cover.",
  icon: <span />,
  color: "trail-green",
};

beforeEach(() => {
  render(
    <MantineProvider>
      <Highlight feature={feature} />
    </MantineProvider>,
  );
});

it("renders the feature label", () => {
  expect(screen.getByText("Gear")).toBeInTheDocument();
});

it("renders the feature title", () => {
  expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
    "Your kit, catalogued",
  );
});

it("renders the feature description", () => {
  expect(
    screen.getByText(
      "Build a personal inventory of everything you own. Weight, category, condition; it's all there when you need it. No more wondering if you packed the rain cover.",
    ),
  ).toBeInTheDocument();
});
