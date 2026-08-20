import { describe, it, mock, expect, spyOn, afterEach } from "bun:test";
import { stashSession } from "$/middleware/stash-session";
import { auth } from "$/utils/auth";
import * as Sentry from "@sentry/bun";

const mockSession = {
  session: { id: "session-1" },
  user: { id: "user-1", email: "test@example.com" },
} as any;

afterEach(() => {
  mock.restore();
});

describe("stashSession", () => {
  it("attaches the session to the request when one exists", async () => {
    spyOn(auth.api, "getSession").mockResolvedValueOnce(mockSession);
    const mockReq = { headers: {} } as any;
    const mockRes = {} as any;
    const next = mock();

    await stashSession(mockReq, mockRes, next);

    expect(mockReq.session).toBe(mockSession);
  });

  it("sets the Sentry user when a session exists", async () => {
    spyOn(auth.api, "getSession").mockResolvedValueOnce(mockSession);
    const setUser = spyOn(Sentry, "setUser");
    const mockReq = { headers: {} } as any;
    const mockRes = {} as any;
    const next = mock();

    await stashSession(mockReq, mockRes, next);

    expect(setUser).toHaveBeenCalledWith({
      id: "user-1",
      email: "test@example.com",
    });
  });

  it("does not attach a session or set the Sentry user when none exists", async () => {
    spyOn(auth.api, "getSession").mockResolvedValueOnce(null as any);
    const setUser = spyOn(Sentry, "setUser");
    const mockReq = { headers: {} } as any;
    const mockRes = {} as any;
    const next = mock();

    await stashSession(mockReq, mockRes, next);

    expect(mockReq.session).toBeUndefined();
    expect(setUser).not.toHaveBeenCalled();
  });

  it("calls next regardless of whether a session exists", async () => {
    spyOn(auth.api, "getSession").mockResolvedValueOnce(null as any);
    const mockReq = { headers: {} } as any;
    const mockRes = {} as any;
    const next = mock();

    await stashSession(mockReq, mockRes, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("logs a warning when a session cookie was sent but no session resolved", async () => {
    spyOn(auth.api, "getSession").mockResolvedValueOnce(null as any);
    const warn = mock();
    const mockReq = {
      headers: {
        cookie: "__Secure-better-auth.session_token=abc123",
        "user-agent": "test-agent",
      },
      originalUrl: "/dashboard",
      logger: { warn },
    } as any;
    const mockRes = {} as any;
    const next = mock();

    await stashSession(mockReq, mockRes, next);

    expect(warn).toHaveBeenCalledWith(
      "Session cookie present but no session resolved",
      { path: "/dashboard", userAgent: "test-agent" },
    );
  });

  it("does not log when no session cookie was sent", async () => {
    spyOn(auth.api, "getSession").mockResolvedValueOnce(null as any);
    const warn = mock();
    const mockReq = { headers: {}, logger: { warn } } as any;
    const mockRes = {} as any;
    const next = mock();

    await stashSession(mockReq, mockRes, next);

    expect(warn).not.toHaveBeenCalled();
  });
});
