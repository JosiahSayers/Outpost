import "@testing-library/jest-dom";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

let sessionData: {
  user: { role?: string; twoFactorEnabled?: boolean; emailVerified?: boolean };
} | null = null;
let isPending = false;
let sessionError: { status: number } | null = null;
const refetch = mock(() => Promise.resolve());

mock.module("$/frontend/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: sessionData,
      isPending,
      error: sessionError,
      refetch,
    }),
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
    sessionError = null;
    refetch.mockClear();
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
    sessionError = null;
    refetch.mockClear();
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

describe("when the session check fails with a transient (non-401) error and there is no cached data", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = null;
    isPending = false;
    sessionError = { status: 502 };
    refetch.mockClear();
    navigate.mockClear();
    render(
      <Router hook={() => ["/console", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("does not navigate, treating it like a still-loading session", () => {
    expect(navigate).not.toHaveBeenCalled();
  });

  it("retries the session check", async () => {
    await waitFor(() => expect(refetch).toHaveBeenCalled(), {
      timeout: 3000,
    });
  });
});

describe("when the session check fails with a 401", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = null;
    isPending = false;
    sessionError = { status: 401 };
    navigate.mockClear();
    render(
      <Router hook={() => ["/console", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("navigates to sign-in, since a 401 confirms there is no session", () => {
    expect(navigate).toHaveBeenCalledWith(
      "/sign-in?redirect=%2Fconsole",
      undefined,
    );
  });
});

describe("when there is a session for a non-admin user", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = { user: { role: "user" } };
    isPending = false;
    sessionError = null;
    refetch.mockClear();
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

describe("when there is a session for an admin user with MFA enabled and a verified email", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = {
      user: { role: "admin", twoFactorEnabled: true, emailVerified: true },
    };
    isPending = false;
    sessionError = null;
    refetch.mockClear();
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

describe("when there is a session for an admin user without MFA enabled", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = {
      user: { role: "admin", twoFactorEnabled: false, emailVerified: true },
    };
    isPending = false;
    sessionError = null;
    refetch.mockClear();
    navigate.mockClear();
    render(
      <Router hook={() => ["/console", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("navigates to the security settings page with a flag explaining why", () => {
    expect(navigate).toHaveBeenCalledWith(
      "/account/security?adminMfaRequired=true",
      undefined,
    );
  });
});

describe("when there is a session for an admin user missing both MFA and a verified email", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = {
      user: { role: "admin", twoFactorEnabled: false, emailVerified: false },
    };
    isPending = false;
    sessionError = null;
    refetch.mockClear();
    navigate.mockClear();
    render(
      <Router hook={() => ["/console", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("navigates to the security settings page first, ahead of the profile page", () => {
    expect(navigate).toHaveBeenCalledWith(
      "/account/security?adminMfaRequired=true",
      undefined,
    );
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe("when there is a session for an admin user with an unverified email", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = {
      user: { role: "admin", twoFactorEnabled: true, emailVerified: false },
    };
    isPending = false;
    sessionError = null;
    refetch.mockClear();
    navigate.mockClear();
    render(
      <Router hook={() => ["/console", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("navigates to the profile settings page with a flag explaining why", () => {
    expect(navigate).toHaveBeenCalledWith(
      "/account/profile?adminEmailVerificationRequired=true",
      undefined,
    );
  });
});
