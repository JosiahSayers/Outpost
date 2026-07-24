import LinkDescriptionField from "$/frontend/trip/links/link-description-field";
import type { ClientTripLink } from "$/transformers/trip-link";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mantine's Textarea autosize hooks into font-loading events; happy-dom doesn't
// implement document.fonts, so stub it to avoid a crash in act-compat.
if (!document.fonts) {
  Object.defineProperty(document, "fonts", {
    value: { addEventListener: () => {}, removeEventListener: () => {} },
    configurable: true,
  });
}

function link(overrides: Partial<ClientTripLink> = {}): ClientTripLink {
  return {
    id: "link-1",
    url: "https://example.com/trail/guide",
    name: null,
    description: "Everything you need to know about the trail.",
    imageUrl: null,
    siteName: null,
    type: null,
    audioUrl: null,
    videoUrl: null,
    ...overrides,
  };
}

function renderField(l: ClientTripLink, revealEmpty = false) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <LinkDescriptionField
          tripId="trip-1"
          link={l}
          revealEmpty={revealEmpty}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
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

describe("with a description", () => {
  it("renders the description as text", () => {
    renderField(link({ description: "A great trail." }));
    expect(screen.getByText("A great trail.")).toBeInTheDocument();
  });

  it("enters edit mode on click, pre-filled with the current description", () => {
    renderField(link({ description: "A great trail." }));
    fireEvent.click(screen.getByText("A great trail."));
    expect(
      screen.getByRole("textbox", { name: "Link description" }),
    ).toHaveValue("A great trail.");
  });
});

describe("without a description", () => {
  it("renders nothing when not revealed", () => {
    renderField(link({ description: null }), false);
    expect(screen.queryByText("Add a description")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows a dimmed 'Add a description' prompt when revealed", () => {
    renderField(link({ description: null }), true);
    expect(screen.getByText("Add a description")).toBeInTheDocument();
  });
});

describe("committing an edit", () => {
  it("commits on Enter with the new description", async () => {
    renderField(link({ id: "link-42", description: "Old description" }));
    fireEvent.click(screen.getByText("Old description"));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Link description" }),
      { target: { value: "New description" } },
    );
    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "Link description" }),
      { key: "Enter" },
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/links/link-42");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      description: "New description",
    });
  });

  it("commits on blur with the new description", async () => {
    renderField(link({ id: "link-42", description: "Old description" }));
    fireEvent.click(screen.getByText("Old description"));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Link description" }),
      { target: { value: "New description" } },
    );
    fireEvent.blur(screen.getByRole("textbox", { name: "Link description" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/links/link-42");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      description: "New description",
    });
  });

  it("does not call the API when the description is unchanged", () => {
    renderField(link({ description: "Same description" }));
    fireEvent.click(screen.getByText("Same description"));
    fireEvent.blur(screen.getByRole("textbox", { name: "Link description" }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("cancels on Escape without calling the API", () => {
    renderField(link({ description: "Old description" }));
    fireEvent.click(screen.getByText("Old description"));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Link description" }),
      { target: { value: "New description" } },
    );
    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "Link description" }),
      { key: "Escape" },
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText("Old description")).toBeInTheDocument();
  });
});
