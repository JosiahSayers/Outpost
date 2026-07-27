import { describe, it, mock, expect, spyOn } from "bun:test";
import { stashRequestMetadata } from "$/middleware/stash-request-meta";

describe("stashRequestMetadata", () => {
  it("stashes the current time to start", () => {
    const mockReq = {} as any;
    const mockRes = {} as any;
    const next = mock();
    stashRequestMetadata(mockReq, mockRes, next);

    expect(mockReq.start).toBeCloseTo(new Date().getTime(), -3);
  });

  it("stashes a uuid to id", () => {
    const mockReq = {} as any;
    const mockRes = {} as any;
    const next = mock();
    spyOn(Bun, "randomUUIDv7").mockReturnValueOnce("test-uuid" as any);
    stashRequestMetadata(mockReq, mockRes, next);

    expect(mockReq.id).toBe("test-uuid");
  });

  it("calls next", () => {
    const mockReq = {} as any;
    const mockRes = {} as any;
    const next = mock();
    stashRequestMetadata(mockReq, mockRes, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
