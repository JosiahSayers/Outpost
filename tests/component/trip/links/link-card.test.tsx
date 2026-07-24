import LinkCard from "$/frontend/trip/links/link-card";
import type { ClientTripLink } from "$/transformers/trip-link";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

let isTouchDevice = false;
window.matchMedia = (query: string) =>
  ({
    matches: query === "(hover: none)" ? isTouchDevice : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

function link(overrides: Partial<ClientTripLink> = {}): ClientTripLink {
  return {
    id: "link-1",
    url: "https://example.com/trail/guide",
    name: "Appalachian Trail Guide",
    description: "Everything you need to know.",
    imageUrl: null,
    siteName: null,
    type: null,
    audioUrl: null,
    videoUrl: null,
    ...overrides,
  };
}

function renderCard(l: ClientTripLink) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <LinkCard tripId="trip-1" link={l} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  isTouchDevice = false;
  global.fetch = mock(() =>
    Promise.resolve(new Response(null, { status: 200 })),
  ) as unknown as typeof fetch;
});

describe("rendering", () => {
  it("renders the title and description", () => {
    renderCard(link());
    expect(screen.getByText("Appalachian Trail Guide")).toBeInTheDocument();
    expect(
      screen.getByText("Everything you need to know."),
    ).toBeInTheDocument();
  });

  it("renders the site name as a badge when present", () => {
    renderCard(link({ siteName: "NPS" }));
    // The thumbnail fallback also renders the site name, so scope past it
    // to the badge rendered alongside the metadata text.
    const anchor = screen.getByRole("link");
    const badge = screen.getAllByText("NPS").find((el) => !anchor.contains(el));
    expect(badge).toBeInTheDocument();
  });

  it("wraps the thumbnail in a link to the original url", () => {
    renderCard(link({ url: "https://example.com/trail/guide" }));
    const anchor = screen.getByRole("link", {
      name: "Open Appalachian Trail Guide",
    });
    expect(anchor).toHaveAttribute("href", "https://example.com/trail/guide");
    expect(anchor).toHaveAttribute("target", "_blank");
    expect(anchor).toHaveAttribute("rel", "noreferrer");
  });

  it("labels the thumbnail link with the hostname when there is no title", () => {
    renderCard(link({ name: null, url: "https://nps.gov/mora" }));
    expect(
      screen.getByRole("link", { name: "Open nps.gov" }),
    ).toBeInTheDocument();
  });
});

describe("metadata text", () => {
  it("shows the hostname when a title or description is present", () => {
    renderCard(link({ url: "https://nps.gov/mora" }));
    // The thumbnail fallback also renders the hostname when there's no site
    // name, so scope past it to the metadata text below the title.
    const anchor = screen.getByRole("link");
    const meta = screen
      .getAllByText("nps.gov")
      .find((el) => !anchor.contains(el));
    expect(meta).toBeInTheDocument();
  });

  it("shows the full url when there is neither a title nor a description", () => {
    renderCard(
      link({ name: null, description: null, url: "https://nps.gov/mora" }),
    );
    expect(screen.getByText("https://nps.gov/mora")).toBeInTheDocument();
  });
});

describe("hover reveal of empty fields", () => {
  it("hides 'add a title'/'add a description' prompts by default", () => {
    renderCard(link({ name: null, description: null }));
    expect(screen.queryByText("Add a title")).not.toBeInTheDocument();
    expect(screen.queryByText("Add a description")).not.toBeInTheDocument();
  });

  it("reveals the prompts on hover", () => {
    renderCard(link({ name: null, description: null }));
    // The Card itself has no accessible role, but it's the delete button's
    // direct parent — use that to reach it without relying on DOM structure.
    fireEvent.mouseEnter(
      screen.getByRole("button", { name: "Delete link" }).parentElement!,
    );
    expect(screen.getByText("Add a title")).toBeInTheDocument();
    expect(screen.getByText("Add a description")).toBeInTheDocument();
  });

  it("reveals the prompts unconditionally on touch devices", () => {
    isTouchDevice = true;
    renderCard(link({ name: null, description: null }));
    expect(screen.getByText("Add a title")).toBeInTheDocument();
    expect(screen.getByText("Add a description")).toBeInTheDocument();
  });
});

describe("deleting", () => {
  it("opens a confirmation modal", async () => {
    renderCard(link());
    fireEvent.click(screen.getByRole("button", { name: "Delete link" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Delete link?" }),
      ).toBeInTheDocument(),
    );
  });

  it("includes the title in the confirmation copy", async () => {
    renderCard(link({ name: "Appalachian Trail Guide" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete link" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Delete link?" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent ===
          "Remove Appalachian Trail Guide from this trip? This can't be undone.",
      ),
    ).toBeInTheDocument();
  });

  it("falls back to the hostname in the confirmation copy when there is no title", async () => {
    renderCard(link({ name: null, url: "https://nps.gov/mora" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete link" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Delete link?" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent ===
          "Remove nps.gov from this trip? This can't be undone.",
      ),
    ).toBeInTheDocument();
  });

  it("calls the delete API when confirmed", async () => {
    renderCard(link({ id: "link-99" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete link" }));
    await waitFor(() => screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/links/link-99");
    expect(init.method).toBe("DELETE");
  });

  it("does not call the delete API when cancelled", async () => {
    renderCard(link());
    fireEvent.click(screen.getByRole("button", { name: "Delete link" }));
    await waitFor(() => screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
