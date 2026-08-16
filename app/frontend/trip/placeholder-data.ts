// Fake data standing in for BTP-134's trip safety info — the backend
// (TripSafetyInfo + TripPartyMember) doesn't exist yet. The shapes here are
// meant to mirror the eventual Prisma models closely enough that wiring up
// the real API later is mostly a rename, not a rewrite. Swap this out once
// that lands.

export interface PlaceholderSafetyInfo {
  emergencyContactName: string;
  emergencyContactPhone: string;
  rangerStationName: string;
  rangerStationPhone: string;
  departureTime: string; // "HH:mm", 24-hour, empty string when unset
  returnTime: string; // "HH:mm", 24-hour, empty string when unset
  vehicleDescription: string;
  permitNumber: string;
  medicalNotes: string;
}

export interface PlaceholderPartyMember {
  id: string;
  name: string;
  phone: string;
  /** Set when this member is linked to a registered account — name is
   * sourced from that account and isn't editable from this section. */
  userId?: string | null;
}

export const placeholderSafetyInfo: PlaceholderSafetyInfo = {
  emergencyContactName: "Maren Ostrander",
  emergencyContactPhone: "(206) 555-0148",
  rangerStationName: "Marblemount Wilderness Information Center",
  rangerStationPhone: "(360) 854-7245",
  departureTime: "06:30",
  returnTime: "16:00",
  vehicleDescription: "Green 2021 Subaru Outback, WA plate BPX-2214",
  permitNumber: "NCNP-2026-0871",
  medicalNotes: "Theo carries an EpiPen (bee allergy).",
};

export const placeholderPartyMembers: PlaceholderPartyMember[] = [
  { id: "p1", name: "Josiah Sayers", phone: "", userId: "self" },
  { id: "p2", name: "Theo Nakamura", phone: "(503) 555-0119" },
  { id: "p3", name: "Priya Anand", phone: "" },
];

// Mirrors the nudge rules agreed for BTP-134: emergency contact, ranger
// station, both times, and a non-empty party are required; vehicle, permit,
// and medical notes stay optional and never gate this.
export function isSafetyInfoComplete(
  info: PlaceholderSafetyInfo,
  party: PlaceholderPartyMember[],
): boolean {
  return (
    Boolean(info.emergencyContactName.trim()) &&
    Boolean(info.emergencyContactPhone.trim()) &&
    Boolean(info.rangerStationName.trim()) &&
    Boolean(info.rangerStationPhone.trim()) &&
    Boolean(info.departureTime) &&
    Boolean(info.returnTime) &&
    party.length > 0
  );
}
