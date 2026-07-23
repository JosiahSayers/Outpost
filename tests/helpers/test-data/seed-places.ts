import { db } from "$/utils/db";

// A small, hand-picked set of well-known public lands so the trip Location
// autocomplete (backed by /api/places) has something realistic to match
// against locally. Real PAD-US data arrives via the ingest job; this is just
// enough to exercise search, prefix matching, and state filtering by hand.
// Kept as data so the dev seed and any future e2e fixtures share one source.
export const SAMPLE_PLACES = [
  {
    name: "Mount Rainier National Park",
    state: "WA",
    publicAccess: "Open",
    backpackingTier: 3,
    acres: 236381,
  },
  {
    name: "Olympic National Park",
    state: "WA",
    publicAccess: "Open",
    backpackingTier: 3,
    acres: 922650,
  },
  {
    name: "North Cascades National Park",
    state: "WA",
    publicAccess: "Open",
    backpackingTier: 3,
    acres: 504781,
  },
  {
    name: "Yosemite National Park",
    state: "CA",
    publicAccess: "Open",
    backpackingTier: 3,
    acres: 759620,
  },
  {
    name: "Yellowstone National Park",
    state: "WY",
    publicAccess: "Open",
    backpackingTier: 3,
    acres: 2219791,
  },
  {
    name: "Rocky Mountain National Park",
    state: "CO",
    publicAccess: "Open",
    backpackingTier: 3,
    acres: 265807,
  },
  {
    name: "Grand Teton National Park",
    state: "WY",
    publicAccess: "Open",
    backpackingTier: 3,
    acres: 310044,
  },
  {
    name: "Glacier National Park",
    state: "MT",
    publicAccess: "Open",
    backpackingTier: 3,
    acres: 1013126,
  },
  {
    name: "Mount Baker-Snoqualmie National Forest",
    state: "WA",
    publicAccess: "Open",
    backpackingTier: 3,
    acres: 1724228,
  },
  {
    name: "Inyo National Forest",
    state: "CA",
    publicAccess: "Open",
    backpackingTier: 3,
    acres: 1955148,
  },
  {
    name: "Desolation Wilderness",
    state: "CA",
    publicAccess: "Restricted",
    backpackingTier: 3,
    acres: 63960,
  },
  {
    name: "Enchantments Permit Area",
    state: "WA",
    publicAccess: "Restricted",
    backpackingTier: 3,
    acres: 15700,
  },
] as const;

// Insert the sample places if none exist yet. Places are global reference data
// (not user-scoped), so this guards on an existing count rather than blindly
// re-inserting — running the seed twice won't pile up duplicates.
export async function seedPlaces() {
  const existing = await db.place.count();
  if (existing > 0) return;

  await db.place.createMany({ data: [...SAMPLE_PLACES] });
}
