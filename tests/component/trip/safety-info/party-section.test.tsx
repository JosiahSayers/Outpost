import PartySection from "$/frontend/trip/safety-info/party-section";
import type { ClientTripPartyMember } from "$/transformers/trip-party-member";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

function member(
  overrides: Partial<ClientTripPartyMember> = {},
): ClientTripPartyMember {
  return {
    id: "p1",
    name: "Josiah Sayers",
    phone: "",
    userId: null,
    ...overrides,
  };
}

function renderSection(party: ClientTripPartyMember[]) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <PartySection tripId="trip-1" party={party} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

// The party list and "Add someone" button live inside a Collapse, which
// stays mounted-but-inert while closed — role queries only resolve once it's
// open (see feedback_happy_dom_quirks memory, #7).
async function openSection() {
  fireEvent.click(screen.getByText(/in your party|No one added yet/));
  await waitFor(() => screen.getByRole("button", { name: "Add someone" }));
}

function lastFetchCall() {
  const calls = (global.fetch as unknown as ReturnType<typeof mock>).mock.calls;
  return calls[calls.length - 1]! as [string, RequestInit];
}

beforeEach(() => {
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ partyMember: member() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
});

describe("with no one added", () => {
  it("renders the empty state", () => {
    renderSection([]);
    expect(screen.getByText("No one added yet")).toBeInTheDocument();
  });
});

describe("with party members", () => {
  function twoMembers() {
    return [
      member({ id: "p1", name: "Josiah Sayers", phone: "" }),
      member({ id: "p2", name: "Theo Nakamura", phone: "(503) 555-0119" }),
    ];
  }

  it("renders the count in the summary", () => {
    renderSection(twoMembers());
    expect(screen.getByText("2 in your party")).toBeInTheDocument();
  });

  it("expanding shows each member's name and phone", async () => {
    renderSection(twoMembers());
    await openSection();
    expect(screen.getByText("Josiah Sayers")).toBeInTheDocument();
    expect(screen.getByText("Theo Nakamura")).toBeInTheDocument();
    expect(screen.getByText("(503) 555-0119")).toBeInTheDocument();
  });

  it("clicking remove DELETEs the member", async () => {
    renderSection(twoMembers());
    await openSection();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Theo Nakamura from the party",
      }),
    );
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/trips/trip-1/party-members/p2");
    expect(init.method).toBe("DELETE");
  });
});

describe("editing a member", () => {
  it("clicking a member's name shows an editable input and PATCHes on blur", async () => {
    renderSection([member({ id: "p2", name: "Theo Nakamura" })]);
    await openSection();
    fireEvent.click(screen.getByText("Theo Nakamura"));
    const input = screen.getByRole("textbox", {
      name: "Edit Theo Nakamura's name",
    });
    fireEvent.change(input, { target: { value: "Theodore Nakamura" } });
    fireEvent.blur(input);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/trips/trip-1/party-members/p2");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      name: "Theodore Nakamura",
    });
  });

  it("clicking a member's phone shows an editable input and PATCHes on Enter", async () => {
    renderSection([member({ id: "p2", name: "Theo Nakamura", phone: "" })]);
    await openSection();
    fireEvent.click(screen.getByText("Add phone"));
    const input = screen.getByRole("textbox", {
      name: "Edit Theo Nakamura's phone number",
    });
    fireEvent.change(input, { target: { value: "(555) 010-2000" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/trips/trip-1/party-members/p2");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      phone: "(555) 010-2000",
    });
  });

  it("does not allow editing the current user's own name", async () => {
    renderSection([
      member({ id: "p1", name: "Josiah Sayers", userId: "self" }),
    ]);
    await openSection();
    fireEvent.click(screen.getByText("Josiah Sayers"));
    expect(
      screen.queryByRole("textbox", { name: "Edit Josiah Sayers's name" }),
    ).not.toBeInTheDocument();
  });

  it("still allows editing the current user's own phone", async () => {
    renderSection([
      member({ id: "p1", name: "Josiah Sayers", userId: "self", phone: "" }),
    ]);
    await openSection();
    fireEvent.click(screen.getByText("Add phone"));
    const input = screen.getByRole("textbox", {
      name: "Edit Josiah Sayers's phone number",
    });
    fireEvent.change(input, { target: { value: "(555) 010-3000" } });
    fireEvent.blur(input);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/trips/trip-1/party-members/p1");
    expect(JSON.parse(init.body as string)).toEqual({
      phone: "(555) 010-3000",
    });
  });
});

describe("adding someone", () => {
  it("shows name and phone inputs when 'Add someone' is clicked", async () => {
    renderSection([]);
    await openSection();
    fireEvent.click(screen.getByRole("button", { name: "Add someone" }));
    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone (optional)")).toBeInTheDocument();
  });

  it("submits the trimmed name and phone via the Add button", async () => {
    renderSection([]);
    await openSection();
    fireEvent.click(screen.getByRole("button", { name: "Add someone" }));
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "  Priya Anand  " },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone (optional)"), {
      target: { value: "(555) 010-1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/trips/trip-1/party-members");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      name: "Priya Anand",
      phone: "(555) 010-1000",
    });
  });

  it("submits with Enter from the name field", async () => {
    renderSection([]);
    await openSection();
    fireEvent.click(screen.getByRole("button", { name: "Add someone" }));
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Priya Anand" },
    });
    fireEvent.keyDown(screen.getByPlaceholderText("Name"), { key: "Enter" });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, init] = lastFetchCall();
    expect(JSON.parse(init.body as string)).toEqual({
      name: "Priya Anand",
      phone: "",
    });
  });

  it("does not submit when the name is blank", async () => {
    renderSection([]);
    await openSection();
    fireEvent.click(screen.getByRole("button", { name: "Add someone" }));
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("pressing Escape cancels the add form without submitting", async () => {
    renderSection([]);
    await openSection();
    fireEvent.click(screen.getByRole("button", { name: "Add someone" }));
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Priya Anand" },
    });
    fireEvent.keyDown(screen.getByPlaceholderText("Name"), { key: "Escape" });
    expect(screen.queryByPlaceholderText("Name")).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
