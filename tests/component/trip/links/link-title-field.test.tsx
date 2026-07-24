import LinkTitleField from "$/frontend/trip/links/link-title-field";
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
    description: null,
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
        <LinkTitleField tripId="trip-1" link={l} revealEmpty={revealEmpty} />
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

describe("with a title", () => {
  it("renders the title as text", () => {
    renderField(link({ name: "Appalachian Trail Guide" }));
    expect(screen.getByText("Appalachian Trail Guide")).toBeInTheDocument();
  });

  it("enters edit mode on click, pre-filled with the current title", () => {
    renderField(link({ name: "Appalachian Trail Guide" }));
    fireEvent.click(screen.getByText("Appalachian Trail Guide"));
    expect(screen.getByRole("textbox", { name: "Link title" })).toHaveValue(
      "Appalachian Trail Guide",
    );
  });
});

describe("without a title", () => {
  it("renders nothing when not revealed", () => {
    renderField(link({ name: null }), false);
    expect(screen.queryByText("Add a title")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows a dimmed 'Add a title' prompt when revealed", () => {
    renderField(link({ name: null }), true);
    expect(screen.getByText("Add a title")).toBeInTheDocument();
  });
});

describe("committing an edit", () => {
  it("calls the update API with the new title on Enter", async () => {
    renderField(link({ id: "link-42", name: "Old Title" }));
    fireEvent.click(screen.getByText("Old Title"));
    fireEvent.change(screen.getByRole("textbox", { name: "Link title" }), {
      target: { value: "New Title" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Link title" }), {
      key: "Enter",
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/links/link-42");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ name: "New Title" });
  });

  it("commits on blur", async () => {
    renderField(link({ name: "Old Title" }));
    fireEvent.click(screen.getByText("Old Title"));
    fireEvent.change(screen.getByRole("textbox", { name: "Link title" }), {
      target: { value: "New Title" },
    });
    fireEvent.blur(screen.getByRole("textbox", { name: "Link title" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  it("does not call the API when the title is unchanged", () => {
    renderField(link({ name: "Same Title" }));
    fireEvent.click(screen.getByText("Same Title"));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Link title" }), {
      key: "Enter",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("cancels on Escape without calling the API", () => {
    renderField(link({ name: "Old Title" }));
    fireEvent.click(screen.getByText("Old Title"));
    fireEvent.change(screen.getByRole("textbox", { name: "Link title" }), {
      target: { value: "New Title" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Link title" }), {
      key: "Escape",
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText("Old Title")).toBeInTheDocument();
  });
});
