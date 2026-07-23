import type { Place } from "../../generated/prisma/browser";

export type PublicAccess = "Open" | "Restricted" | "Closed" | "Unknown";

export type ClientPlace = Pick<Place, "id" | "name" | "state"> & {
  publicAccess: PublicAccess | null;
};

// publicAccess is already stored as a human-readable word on Place (mapped from
// the PAD-US Pub_Access code during canonical derivation), so this is a
// passthrough. The cast narrows the stored string to the known label union.
export function transform(item: Place): ClientPlace {
  return {
    id: item.id,
    name: item.name,
    state: item.state,
    publicAccess: (item.publicAccess as PublicAccess | null) ?? null,
  };
}
