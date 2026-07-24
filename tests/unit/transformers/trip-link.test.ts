import { describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";
import { transformers } from "$/transformers";

describe("transform", () => {
  it("returns the expected shape", () => {
    const link = make("TripLink");
    expect(transformers.tripLink(link)).toEqual({
      id: link.id,
      audioUrl: link.audioUrl,
      description: link.description,
      imageUrl: link.imageUrl,
      name: link.name,
      siteName: link.siteName,
      type: link.type,
      url: link.url,
      videoUrl: link.videoUrl,
    });
  });

  it("does not leak internal fields", () => {
    const link = make("TripLink");
    const result = transformers.tripLink(link);
    expect(result).not.toHaveProperty("tripId");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });

  it("passes through null optional fields", () => {
    const link = make("TripLink", {
      name: null,
      description: null,
      imageUrl: null,
      type: null,
      siteName: null,
      audioUrl: null,
      videoUrl: null,
    });
    expect(transformers.tripLink(link)).toMatchObject({
      name: null,
      description: null,
      imageUrl: null,
      type: null,
      siteName: null,
      audioUrl: null,
      videoUrl: null,
    });
  });
});
