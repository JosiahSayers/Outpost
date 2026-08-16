import { describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";
import { transformers } from "$/transformers";

describe("transform", () => {
  it("returns the expected shape for a guest member with no linked user", () => {
    const member = make("TripPartyMember", {
      name: "Jamie Guest",
      phone: "555-0100",
      userId: null,
    });
    expect(transformers.tripPartyMember(member)).toEqual({
      id: member.id,
      name: "Jamie Guest",
      phone: "555-0100",
      userId: null,
    });
  });

  it("uses the linked user's name instead of the member's own name", () => {
    const user = make("User", { name: "Jordan Doe" });
    const member = {
      ...make("TripPartyMember", { name: "Ignored", userId: user.id }),
      user,
    };
    expect(transformers.tripPartyMember(member)).toEqual({
      id: member.id,
      name: "Jordan Doe",
      phone: member.phone,
      userId: user.id,
    });
  });

  it("does not leak internal fields", () => {
    const member = make("TripPartyMember");
    const result = transformers.tripPartyMember(member);
    expect(result).not.toHaveProperty("tripId");
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });

  it("passes through null name and phone when there is no linked user", () => {
    const member = make("TripPartyMember", {
      name: null,
      phone: null,
      userId: null,
    });
    expect(transformers.tripPartyMember(member)).toEqual({
      id: member.id,
      name: null,
      phone: null,
      userId: null,
    });
  });
});
