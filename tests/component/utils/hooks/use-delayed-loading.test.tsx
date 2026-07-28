import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function Display({
  isLoading,
  delayMs,
  minDurationMs,
}: {
  isLoading: boolean;
  delayMs?: number;
  minDurationMs?: number;
}) {
  const showLoading = useDelayedLoading(isLoading, { delayMs, minDurationMs });
  return <div data-testid="state">{showLoading ? "loading" : "idle"}</div>;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("while loading is under the delay threshold", () => {
  it("does not show a loading state", async () => {
    render(<Display isLoading={true} delayMs={100} minDurationMs={0} />);
    expect(screen.getByTestId("state")).toHaveTextContent("idle");

    await wait(50);
    expect(screen.getByTestId("state")).toHaveTextContent("idle");
  });
});

describe("once loading has been ongoing past the delay threshold", () => {
  it("shows a loading state", async () => {
    render(<Display isLoading={true} delayMs={20} minDurationMs={0} />);

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("loading");
    });
  });
});

describe("when loading finishes before the delay threshold", () => {
  it("never shows a loading state", async () => {
    const { rerender } = render(
      <Display isLoading={true} delayMs={100} minDurationMs={0} />,
    );
    await wait(30);
    rerender(<Display isLoading={false} delayMs={100} minDurationMs={0} />);

    await wait(100);
    expect(screen.getByTestId("state")).toHaveTextContent("idle");
  });
});

describe("when loading finishes after the delay threshold with no minimum duration", () => {
  it("hides the loading state immediately", async () => {
    const { rerender } = render(
      <Display isLoading={true} delayMs={20} minDurationMs={0} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("loading");
    });

    rerender(<Display isLoading={false} delayMs={20} minDurationMs={0} />);
    expect(screen.getByTestId("state")).toHaveTextContent("idle");
  });
});

describe("when loading finishes before the minimum duration has elapsed", () => {
  it("keeps showing the loading state until the minimum duration passes", async () => {
    const { rerender } = render(
      <Display isLoading={true} delayMs={20} minDurationMs={100} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("loading");
    });

    // loading finishes right away, well before the 100ms minimum
    rerender(<Display isLoading={false} delayMs={20} minDurationMs={100} />);
    expect(screen.getByTestId("state")).toHaveTextContent("loading");

    await wait(50);
    expect(screen.getByTestId("state")).toHaveTextContent("loading");

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("idle");
    });
  });
});

describe("when loading finishes after the minimum duration has already elapsed", () => {
  it("hides the loading state immediately", async () => {
    const { rerender } = render(
      <Display isLoading={true} delayMs={20} minDurationMs={30} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("loading");
    });

    await wait(50);
    rerender(<Display isLoading={false} delayMs={20} minDurationMs={30} />);
    expect(screen.getByTestId("state")).toHaveTextContent("idle");
  });
});

describe("when loading resumes before the minimum duration expires", () => {
  it("never flickers off", async () => {
    const { rerender } = render(
      <Display isLoading={true} delayMs={20} minDurationMs={100} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("loading");
    });

    rerender(<Display isLoading={false} delayMs={20} minDurationMs={100} />);
    await wait(20);
    rerender(<Display isLoading={true} delayMs={20} minDurationMs={100} />);

    // still within the original minimum-duration window, and now loading again
    await wait(50);
    expect(screen.getByTestId("state")).toHaveTextContent("loading");
  });
});
