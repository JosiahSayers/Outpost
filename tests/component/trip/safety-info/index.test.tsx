import SafetyInfo from "$/frontend/trip/safety-info";
import type { ClientTripPartyMember } from "$/transformers/trip-party-member";
import type { ClientTripSafetyInfo } from "$/transformers/trip-safety-info";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

function safetyInfo(
  overrides: Partial<ClientTripSafetyInfo> = {},
): ClientTripSafetyInfo {
  return {
    id: "safety-1",
    emergencyContactName: "Maren Ostrander",
    emergencyContactPhone: "(206) 555-0148",
    rangerStationName: "Marblemount Wilderness Information Center",
    rangerStationPhone: "(360) 854-7245",
    expectedDepartureTime: "06:30",
    expectedReturnTime: "16:00",
    vehicleDescription: "Green 2021 Subaru Outback, WA plate BPX-2214",
    permitOrRouteNumber: "NCNP-2026-0871",
    medicalNotes: "Theo carries an EpiPen (bee allergy).",
    ...overrides,
  };
}

function partyMember(
  overrides: Partial<ClientTripPartyMember> = {},
): ClientTripPartyMember {
  return {
    id: "p1",
    name: "Josiah Sayers",
    phone: null,
    userId: null,
    ...overrides,
  };
}

const defaultParty = [
  partyMember({ id: "p1", name: "Josiah Sayers" }),
  partyMember({ id: "p2", name: "Theo Nakamura", phone: "(503) 555-0119" }),
  partyMember({ id: "p3", name: "Priya Anand" }),
];

function renderSafetyInfo({
  info = safetyInfo(),
  party = defaultParty,
  tripStart = "2026-08-22",
  tripEnd = "2026-08-25",
}: {
  info?: ClientTripSafetyInfo | null;
  party?: ClientTripPartyMember[];
  tripStart?: string | null;
  tripEnd?: string | null;
} = {}) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <SafetyInfo
          tripId="trip-1"
          safetyInfo={info}
          partyMembers={party}
          tripStart={tripStart}
          tripEnd={tripEnd}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

// The vehicle/permit/medical rows have no role in view mode, so there's
// nothing to `waitFor` a role on — flush pending macrotasks directly instead
// (same technique as feedback_happy_dom_quirks memory, #4) so the Collapse's
// inert→visible flip completes before the next interaction.
async function openDetails() {
  fireEvent.click(screen.getByText("Vehicle, permit & medical notes"));
  await waitFor(() => {});
}

beforeEach(() => {
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ safetyInfo: safetyInfo() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
});

describe("rendering", () => {
  it("renders the section heading", () => {
    renderSafetyInfo();
    expect(
      screen.getByRole("heading", { name: "Safety Info" }),
    ).toBeInTheDocument();
  });

  it("shows a Complete badge when every required field is filled in", () => {
    renderSafetyInfo();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("shows an Incomplete badge when there's no safety info yet", () => {
    renderSafetyInfo({ info: null, party: [] });
    expect(screen.getByText("Incomplete")).toBeInTheDocument();
  });

  it("shows an Incomplete badge when the party is empty", () => {
    renderSafetyInfo({ party: [] });
    expect(screen.getByText("Incomplete")).toBeInTheDocument();
  });

  it("stays Complete when only optional fields (vehicle, permit, medical) are unset", () => {
    renderSafetyInfo({
      info: safetyInfo({
        vehicleDescription: null,
        permitOrRouteNumber: null,
        medicalNotes: null,
      }),
    });
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("renders the emergency contact and ranger station", () => {
    const info = safetyInfo();
    renderSafetyInfo({ info });
    expect(screen.getByText(info.emergencyContactName!)).toBeInTheDocument();
    expect(screen.getByText(info.emergencyContactPhone!)).toBeInTheDocument();
    expect(screen.getByText(info.rangerStationName!)).toBeInTheDocument();
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
    renderSafetyInfo({ tripStart: null, tripEnd: null });
    expect(screen.queryByText(/, Aug/)).not.toBeInTheDocument();
  });

  it("renders the party summary", () => {
    renderSafetyInfo();
    expect(screen.getByText("3 in your party")).toBeInTheDocument();
  });
});

describe("editing safety info fields", () => {
  it("PUTs the changed field when the emergency contact phone is edited", async () => {
    const info = safetyInfo();
    renderSafetyInfo({ info });
    fireEvent.click(screen.getByText(info.emergencyContactPhone!));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "(555) 010-9999" },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/safety-info");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({
      emergencyContactPhone: "(555) 010-9999",
    });
  });
});

describe("vehicle, permit & medical notes", () => {
  it("are editable once expanded", async () => {
    const info = safetyInfo();
    renderSafetyInfo({ info });
    await openDetails();
    fireEvent.click(screen.getByText(info.vehicleDescription!));
    expect(screen.getByRole("textbox")).toHaveValue(info.vehicleDescription);
  });
});
