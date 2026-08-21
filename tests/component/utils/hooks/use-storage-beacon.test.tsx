import type { useResolvedSession } from "$/frontend/utils/guards/use-resolved-session";
import { useStorageBeacon } from "$/frontend/utils/hooks/use-storage-beacon";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

type Session = ReturnType<typeof useResolvedSession>;

// Returns a fresh object per call, the way better-auth's own useSession
// does -- so the effect's deps change on every render and only the hook's
// own guard stops it reporting more than once.
function sessionStub(session: {
  isPending: boolean;
  user?: { id: string; email: string };
}) {
  return () =>
    ({
      isPending: session.isPending,
      data: session.user ? { user: session.user } : null,
      error: null,
      isRefetching: false,
      refetch: () => Promise.resolve(),
    }) as unknown as Session;
}

function renderBeacon(session: Parameters<typeof sessionStub>[0]) {
  const report = mock((_hasSession: boolean) => {});
  const useSession = sessionStub(session);

  function TestComponent() {
    useStorageBeacon(report, useSession);
    return null;
  }

  const view = render(<TestComponent />);

  return {
    report,
    rerender: () => view.rerender(<TestComponent />),
  };
}

describe("useStorageBeacon", () => {
  it("waits for the session to settle rather than recording a pending load as signed out", () => {
    const { report } = renderBeacon({ isPending: true });

    expect(report).not.toHaveBeenCalled();
  });

  it("reports a settled signed-in load", () => {
    const { report } = renderBeacon({
      isPending: false,
      user: { id: "1", email: "test@example.com" },
    });

    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(true);
  });

  it("reports a settled signed-out load, which is the case being investigated", () => {
    const { report } = renderBeacon({ isPending: false });

    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(false);
  });

  it("reports once per page load, not once per render", () => {
    const { report, rerender } = renderBeacon({
      isPending: false,
      user: { id: "1", email: "test@example.com" },
    });

    rerender();
    rerender();

    expect(report).toHaveBeenCalledTimes(1);
  });
});
