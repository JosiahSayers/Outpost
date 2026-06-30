import { queryClient } from "$/frontend/utils/api/query-client";
import { describe, expect, it } from "bun:test";

const retry = queryClient.getDefaultOptions().queries?.retry as (
  failureCount: number,
  error: unknown,
) => boolean;

describe("retry", () => {
  it("does not retry on a 403 error", () => {
    expect(retry(0, { status: 403 })).toBe(false);
  });

  it("retries on a non-403 error when under the failure limit", () => {
    expect(retry(0, { status: 500 })).toBe(true);
    expect(retry(1, { status: 500 })).toBe(true);
    expect(retry(2, { status: 500 })).toBe(true);
  });

  it("stops retrying after 3 failures", () => {
    expect(retry(3, { status: 500 })).toBe(false);
  });

  it("retries on errors with no status", () => {
    expect(retry(0, new Error("network error"))).toBe(true);
  });
});
