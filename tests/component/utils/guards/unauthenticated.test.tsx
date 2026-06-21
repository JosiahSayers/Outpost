import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

let sessionData: { user: object } | null = null;

mock.module("$/frontend/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: sessionData }),
  },
}));

import { useUnauthenticatedGuard } from "$/frontend/utils/guards/unauthenticated.guard";

function TestComponent({ redirect }: { redirect?: string }) {
  useUnauthenticatedGuard(redirect);
  return null;
}

describe("when there is no session", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = null;
    navigate.mockClear();
    render(
      <Router hook={() => ["/sign-in", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("does not navigate", () => {
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("when there is a session", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = { user: { id: "1", email: "test@example.com" } };
    navigate.mockClear();
    render(
      <Router hook={() => ["/sign-in", navigate]}>
        <TestComponent />
      </Router>,
    );
  });

  it("navigates to '/' by default", () => {
    expect(navigate).toHaveBeenCalledWith("/", undefined);
  });
});

describe("when there is a session and a custom redirect is specified", () => {
  const navigate = mock(() => {});

  beforeEach(() => {
    sessionData = { user: { id: "1", email: "test@example.com" } };
    navigate.mockClear();
    render(
      <Router hook={() => ["/sign-in", navigate]}>
        <TestComponent redirect="/dashboard" />
      </Router>,
    );
  });

  it("navigates to the custom redirect", () => {
    expect(navigate).toHaveBeenCalledWith("/dashboard", undefined);
  });
});
