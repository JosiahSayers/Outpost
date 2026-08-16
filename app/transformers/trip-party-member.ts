import type { TripPartyMember, User } from "../../generated/prisma/browser";

export type ClientTripPartyMember = Pick<
  TripPartyMember,
  "id" | "name" | "phone" | "userId"
>;

type TripPartyMemberInput = TripPartyMember & { user?: User };

export function transform(item: TripPartyMemberInput): ClientTripPartyMember {
  return {
    id: item.id,
    name: item.user ? item.user.name : item.name,
    phone: item.phone,
    userId: item.userId,
  };
}
