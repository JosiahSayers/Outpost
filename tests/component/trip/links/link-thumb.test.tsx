import LinkThumb from "$/frontend/trip/links/link-thumb";
import type { ClientTripLink } from "$/transformers/trip-link";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function link(overrides: Partial<ClientTripLink> = {}): ClientTripLink {
  return {
    id: "link-1",
    url: "https://example.com/trail/guide",
    name: null,
    description: null,
    imageUrl: null,
    siteName: null,
    type: null,
    audioUrl: null,
    videoUrl: null,
    ...overrides,
  };
}

function renderThumb(l: ClientTripLink) {
  return render(
    <MantineProvider>
      <LinkThumb link={l} />
    </MantineProvider>,
  );
}

describe("with an image", () => {
  it("renders the og:image", () => {
    const { container } = renderThumb(
      link({ imageUrl: "https://example.com/photo.jpg" }),
    );
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
  });

  it("falls back to the site name when the image fails to load", () => {
    const { container } = renderThumb(
      link({ imageUrl: "https://example.com/broken.jpg", siteName: "Example" }),
    );
    const img = container.querySelector("img")!;
    fireEvent.error(img);

    expect(screen.getByText("Example")).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});

describe("without an image", () => {
  it("renders the site name", () => {
    renderThumb(link({ siteName: "Example" }));
    expect(screen.getByText("Example")).toBeInTheDocument();
  });

  it("renders the full hostname when there is no site name", () => {
    renderThumb(link({ url: "https://nps.gov/mora", siteName: null }));
    expect(screen.getByText("nps.gov")).toBeInTheDocument();
  });
});
