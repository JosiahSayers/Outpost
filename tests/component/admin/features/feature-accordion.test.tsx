import FeatureAccordion from "$/frontend/admin/features/feature-accordion";
import type { Features } from "$/utils/features";
import { Accordion, MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

type Feature = ReturnType<typeof Features.featureList>[number];

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    feature: "trip-file-upload",
    name: "Trip File Upload",
    description: "Surfaces the ability for users to upload files to a trip.",
    ...overrides,
  };
}

function renderAccordion(feature: Feature = makeFeature()) {
  render(
    <MantineProvider>
      <Accordion multiple chevronPosition="right">
        <FeatureAccordion feature={feature} />
      </Accordion>
    </MantineProvider>,
  );
}

it("renders the feature's name, slug, and description", () => {
  renderAccordion();

  expect(screen.getByText("Trip File Upload")).toBeInTheDocument();
  expect(screen.getByText("trip-file-upload")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Surfaces the ability for users to upload files to a trip.",
    ),
  ).toBeInTheDocument();
});

describe("the placeholder panel", () => {
  it("is hidden until the item is opened", () => {
    renderAccordion();

    expect(
      screen.getByText("Status controls for this flag will go here."),
    ).not.toBeVisible();
  });

  it("becomes visible once the item is opened", async () => {
    renderAccordion();

    fireEvent.click(screen.getByText("Trip File Upload"));

    await waitFor(() =>
      expect(
        screen.getByText("Status controls for this flag will go here."),
      ).toBeVisible(),
    );
  });

  it("hides again once the item is collapsed", async () => {
    renderAccordion();
    const control = screen.getByText("Trip File Upload");

    fireEvent.click(control);
    await waitFor(() =>
      expect(
        screen.getByText("Status controls for this flag will go here."),
      ).toBeVisible(),
    );

    fireEvent.click(control);
    await waitFor(() =>
      expect(
        screen.getByText("Status controls for this flag will go here."),
      ).not.toBeVisible(),
    );
  });
});
