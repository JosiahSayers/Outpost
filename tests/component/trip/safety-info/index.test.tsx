import { placeholderSafetyInfo } from "$/frontend/trip/placeholder-data";
import SafetyInfo from "$/frontend/trip/safety-info";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function renderSafetyInfo(
  tripStart: string | null = "2026-08-22",
  tripEnd: string | null = "2026-08-25",
) {
  render(
    <MantineProvider>
      <SafetyInfo tripStart={tripStart} tripEnd={tripEnd} />
    </MantineProvider>,
  );
}

// The party list lives inside a Collapse — wait for a role that only
// resolves once it's genuinely open (see feedback_happy_dom_quirks memory,
// #7) before interacting with anything inside it.
async function openPartySection() {
  fireEvent.click(screen.getByText(/in your party|No one added yet/));
  await waitFor(() => screen.getByRole("button", { name: "Add someone" }));
}

// The vehicle/permit/medical rows have no role in view mode, so there's
// nothing to `waitFor` a role on — flush pending macrotasks directly instead
// (same technique as feedback_happy_dom_quirks memory, #4) so the Collapse's
// inert→visible flip completes before the next interaction.
async function openDetails() {
  fireEvent.click(screen.getByText("Vehicle, permit & medical notes"));
  await waitFor(() => {});
}

describe("rendering", () => {
  it("renders the section heading", () => {
    renderSafetyInfo();
    expect(
      screen.getByRole("heading", { name: "Safety Info" }),
    ).toBeInTheDocument();
  });

  it("shows a Complete badge when the placeholder data is fully filled in", () => {
    renderSafetyInfo();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("renders the emergency contact and ranger station", () => {
    renderSafetyInfo();
    expect(
      screen.getByText(placeholderSafetyInfo.emergencyContactName),
    ).toBeInTheDocument();
    expect(
      screen.getByText(placeholderSafetyInfo.emergencyContactPhone),
    ).toBeInTheDocument();
    expect(
      screen.getByText(placeholderSafetyInfo.rangerStationName),
    ).toBeInTheDocument();
  });

  it("renders the departure and return times", () => {
    renderSafetyInfo();
    expect(screen.getByText("6:30 AM")).toBeInTheDocument();
    expect(screen.getByText("4:00 PM")).toBeInTheDocument();
  });

  it("renders the trip's start and end dates next to the times", () => {
    renderSafetyInfo();
    expect(screen.getByText(", Aug 22")).toBeInTheDocument();
    expect(screen.getByText(", Aug 25")).toBeInTheDocument();
  });

  it("omits the date next to a time when the trip has no start/end set", () => {
    renderSafetyInfo(null, null);
    expect(screen.queryByText(/, Aug/)).not.toBeInTheDocument();
  });

  it("renders the party summary", () => {
    renderSafetyInfo();
    expect(screen.getByText("3 in your party")).toBeInTheDocument();
  });
});

describe("completeness", () => {
  it("flips to Incomplete when a required field is cleared", () => {
    renderSafetyInfo();
    fireEvent.click(
      screen.getByText(placeholderSafetyInfo.emergencyContactPhone),
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(screen.getByText("Incomplete")).toBeInTheDocument();
  });

  it("stays Complete when an optional field (medical notes) is cleared", async () => {
    renderSafetyInfo();
    await openDetails();
    fireEvent.click(screen.getByText(placeholderSafetyInfo.medicalNotes));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("flips to Incomplete once every party member is removed", async () => {
    renderSafetyInfo();
    await openPartySection();
    for (const name of ["Josiah Sayers", "Theo Nakamura", "Priya Anand"]) {
      fireEvent.click(
        screen.getByRole("button", { name: `Remove ${name} from the party` }),
      );
    }
    expect(screen.getByText("Incomplete")).toBeInTheDocument();
  });
});

describe("vehicle, permit & medical notes", () => {
  it("are editable once expanded", async () => {
    renderSafetyInfo();
    await openDetails();
    fireEvent.click(screen.getByText(placeholderSafetyInfo.vehicleDescription));
    expect(screen.getByRole("textbox")).toHaveValue(
      placeholderSafetyInfo.vehicleDescription,
    );
  });
});
