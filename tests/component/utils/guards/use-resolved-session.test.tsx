import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import * as Sentry from "@sentry/react";

let sessionData: { user: { id: string; email: string } } | null = null;
const refetch = mock(() => {});

mock.module("$/frontend/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: sessionData,
      isPending: false,
      error: null,
      refetch,
    }),
  },
}));

import { useResolvedSession } from "$/frontend/utils/guards/use-resolved-session";

function TestComponent() {
  useResolvedSession();
  return null;
}

describe("useResolvedSession", () => {
  let setUser: ReturnType<typeof spyOn>;

  beforeEach(() => {
    refetch.mockClear();
    setUser = spyOn(Sentry, "setUser");
  });

  afterEach(() => {
    setUser.mockRestore();
  });

  it("sets the Sentry user when a session user is present, mirroring the backend", () => {
    sessionData = { user: { id: "1", email: "test@example.com" } };

    render(<TestComponent />);

    expect(setUser).toHaveBeenCalledWith({
      id: "1",
      email: "test@example.com",
    });
  });

  it("clears the Sentry user when there is no session user", () => {
    sessionData = null;

    render(<TestComponent />);

    expect(setUser).toHaveBeenCalledWith(null);
  });
});
