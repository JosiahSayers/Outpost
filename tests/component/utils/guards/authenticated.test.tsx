import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

let sessionData: { user: object } | null = null;
let isPending = false;

mock.module("$/frontend/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: sessionData, isPending }),
  },
}));

import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import {
  SignOutProvider,
  useSignOutContext,
} from "$/frontend/utils/sign-out-context";

function TestComponent({ initiateSignOut }: { initiateSignOut?: boolean }) {
  const { markSignOutInitiated } = useSignOutContext();
  if (initiateSignOut) {
    markSignOutInitiated();
  }
  useAuthenticatedGuard();
  return null;
}

describe("when there is no session and the session is not pending", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = null;
    isPending = false;
    navigate.mockClear();
    render(
      <Router hook={() => ["/dashboard", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("navigates to sign-in with the current location as the redirect param", () => {
    expect(navigate).toHaveBeenCalledWith(
      "/sign-in?redirect=%2Fdashboard",
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
      <Router hook={() => ["/dashboard", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("does not navigate", () => {
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("when there is a valid session", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = { user: { id: "1", email: "test@example.com" } };
    isPending = false;
    navigate.mockClear();
    render(
      <Router hook={() => ["/dashboard", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("does not navigate", () => {
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("when there is no session because a sign-out was initiated", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = null;
    isPending = false;
    navigate.mockClear();
    render(
      <SignOutProvider>
        <Router hook={() => ["/dashboard", navigate]}>
          <TestComponent initiateSignOut />
        </Router>
      </SignOutProvider>,
    );
  });

  it("does not navigate, leaving the sign-out flow to handle it", () => {
    expect(navigate).not.toHaveBeenCalled();
  });
});
