import { apiClient } from "$/frontend/utils/api/client";
import { afterAll, afterEach, expect, it, spyOn } from "bun:test";

const fetchSpy = spyOn(globalThis, "fetch");

afterEach(() => {
  fetchSpy.mockReset();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

it("returns parsed json on a successful json response", async () => {
  fetchSpy.mockImplementation((() =>
    Promise.resolve(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )) as unknown as typeof fetch);

  const result = await apiClient<{ success: boolean }>("/api/test");
  expect(result).toEqual({ success: true });
});

it("returns text on a successful non-json response", async () => {
  fetchSpy.mockImplementation((() =>
    Promise.resolve(
      new Response("ok", { status: 200 }),
    )) as unknown as typeof fetch);

  const result = await apiClient<string>("/api/test");
  expect(result).toBe("ok");
});

it("throws with the status code and status text on a non-ok response", async () => {
  fetchSpy.mockImplementation((() =>
    Promise.resolve(
      new Response(null, { status: 401, statusText: "Unauthorized" }),
    )) as unknown as typeof fetch);

  await expect(apiClient("/api/test")).rejects.toThrow("401 Unauthorized");
});
