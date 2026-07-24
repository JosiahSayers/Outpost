import Links from "$/frontend/trip/links";
import type { ClientTripLink } from "$/transformers/trip-link";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

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

function renderLinks(links: ClientTripLink[] = []) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <Links tripId="trip-1" links={links} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

function submitUrl(url: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Link URL" }), {
    target: { value: url },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
}

beforeEach(() => {
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ link: link() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
});

describe("rendering", () => {
  it("renders the section heading and composer", () => {
    renderLinks();
    expect(screen.getByRole("heading", { name: "Links" })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Link URL" }),
    ).toBeInTheDocument();
  });

  it("renders a card for each existing link", () => {
    renderLinks([
      link({ id: "link-1", name: "Appalachian Trail Guide" }),
      link({ id: "link-2", name: "Backpacking Checklist" }),
    ]);
    expect(screen.getByText("Appalachian Trail Guide")).toBeInTheDocument();
    expect(screen.getByText("Backpacking Checklist")).toBeInTheDocument();
  });
});

describe("creating a link", () => {
  it("calls the create API with the submitted url", async () => {
    renderLinks();
    submitUrl("https://nps.gov/mora");

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/links");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      url: "https://nps.gov/mora",
    });
  });

  it("shows a pending card with the known hostname while the request is in flight", async () => {
    let resolveFetch!: (response: Response) => void;
    global.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as unknown as typeof fetch;

    renderLinks();
    submitUrl("https://nps.gov/mora");

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByText("nps.gov")).toBeInTheDocument();

    resolveFetch(
      new Response(JSON.stringify({ link: link() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText("nps.gov")).not.toBeInTheDocument(),
    );
  });

  it("removes the pending card once the request settles successfully", async () => {
    renderLinks();
    submitUrl("https://nps.gov/mora");

    await waitFor(() =>
      expect(screen.queryByText("nps.gov")).not.toBeInTheDocument(),
    );
  });

  it("removes the pending card even when the request fails", async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response(null, { status: 500 })),
    ) as unknown as typeof fetch;

    renderLinks();
    submitUrl("https://nps.gov/mora");

    await waitFor(() =>
      expect(screen.queryByText("nps.gov")).not.toBeInTheDocument(),
    );
  });
});
