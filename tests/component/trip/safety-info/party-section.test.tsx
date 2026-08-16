import PartySection from "$/frontend/trip/safety-info/party-section";
import type { PlaceholderPartyMember } from "$/frontend/trip/placeholder-data";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function member(
  overrides: Partial<PlaceholderPartyMember> = {},
): PlaceholderPartyMember {
  return { id: "p1", name: "Josiah Sayers", phone: "", ...overrides };
}

function renderSection(
  party: PlaceholderPartyMember[],
  onAdd: (name: string, phone: string) => void = mock(),
  onRemove: (id: string) => void = mock(),
) {
  render(
    <MantineProvider>
      <PartySection party={party} onAdd={onAdd} onRemove={onRemove} />
    </MantineProvider>,
  );
  return { onAdd, onRemove };
}

// The party list and "Add someone" button live inside a Collapse, which
// stays mounted-but-inert while closed — role queries only resolve once it's
// open (see feedback_happy_dom_quirks memory, #7).
async function openSection() {
  fireEvent.click(screen.getByText(/in your party|No one added yet/));
  await waitFor(() => screen.getByRole("button", { name: "Add someone" }));
}

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

  it("clicking remove calls onRemove with the member's id", async () => {
    const { onRemove } = renderSection(twoMembers());
    await openSection();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Theo Nakamura from the party",
      }),
    );
    expect(onRemove).toHaveBeenCalledWith("p2");
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
    const { onAdd } = renderSection([]);
    await openSection();
    fireEvent.click(screen.getByRole("button", { name: "Add someone" }));
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "  Priya Anand  " },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone (optional)"), {
      target: { value: "(555) 010-1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).toHaveBeenCalledWith("Priya Anand", "(555) 010-1000");
  });

  it("submits with Enter from the name field", async () => {
    const { onAdd } = renderSection([]);
    await openSection();
    fireEvent.click(screen.getByRole("button", { name: "Add someone" }));
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Priya Anand" },
    });
    fireEvent.keyDown(screen.getByPlaceholderText("Name"), { key: "Enter" });
    expect(onAdd).toHaveBeenCalledWith("Priya Anand", "");
  });

  it("does not submit when the name is blank", async () => {
    const { onAdd } = renderSection([]);
    await openSection();
    fireEvent.click(screen.getByRole("button", { name: "Add someone" }));
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("pressing Escape cancels the add form without calling onAdd", async () => {
    const { onAdd } = renderSection([]);
    await openSection();
    fireEvent.click(screen.getByRole("button", { name: "Add someone" }));
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Priya Anand" },
    });
    fireEvent.keyDown(screen.getByPlaceholderText("Name"), { key: "Escape" });
    expect(screen.queryByPlaceholderText("Name")).not.toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
