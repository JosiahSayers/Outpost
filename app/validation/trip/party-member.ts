import { idParam } from "$/validation/shared";
import z from "zod";

export const createPartyMember = z.strictObject({
  name: z.string().trim().min(2).max(50),
  phone: z.string().trim().max(20).optional(),
});

export const editPartyMember = createPartyMember.partial();

export const tripPartyMemberParams = idParam.extend({
  memberId: z.string(),
});
