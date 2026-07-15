import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

let sessionData: { user: { role?: string } } | null = null;
let isPending = false;

mock.module("$/frontend/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: sessionData, isPending }),
  },
}));

import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";

function TestComponent() {
  useAdminGuard();
  return null;
}

describe("when there is no session and the session is not pending", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = null;
    isPending = false;
    navigate.mockClear();
    render(
      <Router hook={() => ["/console", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("navigates to sign-in with the current location as the redirect param", () => {
    expect(navigate).toHaveBeenCalledWith(
      "/sign-in?redirect=%2Fconsole",
      undefined,
    );
  });
});

describe("when the session is still loading", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = null;
    isPending = true;
    navigate.mockClear();
    render(
      <Router hook={() => ["/console", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("does not navigate", () => {
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("when there is a session for a non-admin user", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = { user: { role: "user" } };
    isPending = false;
    navigate.mockClear();
    render(
      <Router hook={() => ["/console", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("navigates to the dashboard", () => {
    expect(navigate).toHaveBeenCalledWith("/dashboard", undefined);
  });
});

describe("when there is a session for an admin user", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = { user: { role: "admin" } };
    isPending = false;
    navigate.mockClear();
    render(
      <Router hook={() => ["/console", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("does not navigate", () => {
    expect(navigate).not.toHaveBeenCalled();
  });
});
