import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function Display({
  isLoading: rawIsLoading,
  delayMs,
  minDurationMs,
}: {
  isLoading: boolean;
  delayMs?: number;
  minDurationMs?: number;
}) {
  const { isLoading, showSpinner } = useDelayedLoading(rawIsLoading, {
    delayMs,
    minDurationMs,
  });
  return (
    <div data-testid="state">
      {isLoading ? "blocked" : "settled"}/{showSpinner ? "spinner" : "hidden"}
    </div>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("while loading is under the delay threshold", () => {
  it("blocks content but shows no spinner", async () => {
    render(<Display isLoading={true} delayMs={100} minDurationMs={0} />);
    expect(screen.getByTestId("state")).toHaveTextContent("blocked/hidden");

    await wait(50);
    expect(screen.getByTestId("state")).toHaveTextContent("blocked/hidden");
  });
});

describe("once loading has been ongoing past the delay threshold", () => {
  it("blocks content and shows a spinner", async () => {
    render(<Display isLoading={true} delayMs={20} minDurationMs={0} />);

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("blocked/spinner");
    });
  });
});

describe("when loading finishes before the delay threshold", () => {
  it("never blocks content or shows a spinner", async () => {
    const { rerender } = render(
      <Display isLoading={true} delayMs={100} minDurationMs={0} />,
    );
    await wait(30);
    rerender(<Display isLoading={false} delayMs={100} minDurationMs={0} />);

    await wait(100);
    expect(screen.getByTestId("state")).toHaveTextContent("settled/hidden");
  });
});

describe("when loading finishes after the delay threshold with no minimum duration", () => {
  it("unblocks and hides the spinner immediately", async () => {
    const { rerender } = render(
      <Display isLoading={true} delayMs={20} minDurationMs={0} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("blocked/spinner");
    });

    rerender(<Display isLoading={false} delayMs={20} minDurationMs={0} />);
    expect(screen.getByTestId("state")).toHaveTextContent("settled/hidden");
  });
});

describe("when loading finishes before the minimum duration has elapsed", () => {
  it("keeps blocking content and showing the spinner until the minimum passes", async () => {
    const { rerender } = render(
      <Display isLoading={true} delayMs={20} minDurationMs={100} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("blocked/spinner");
    });

    // loading finishes right away, well before the 100ms minimum
    rerender(<Display isLoading={false} delayMs={20} minDurationMs={100} />);
    expect(screen.getByTestId("state")).toHaveTextContent("blocked/spinner");

    await wait(50);
    expect(screen.getByTestId("state")).toHaveTextContent("blocked/spinner");

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("settled/hidden");
    });
  });
});

describe("when loading finishes after the minimum duration has already elapsed", () => {
  it("unblocks and hides the spinner immediately", async () => {
    const { rerender } = render(
      <Display isLoading={true} delayMs={20} minDurationMs={30} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("blocked/spinner");
    });

    await wait(50);
    rerender(<Display isLoading={false} delayMs={20} minDurationMs={30} />);
    expect(screen.getByTestId("state")).toHaveTextContent("settled/hidden");
  });
});

describe("when loading resumes before the minimum duration expires", () => {
  it("never unblocks or flickers the spinner off", async () => {
    const { rerender } = render(
      <Display isLoading={true} delayMs={20} minDurationMs={100} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("blocked/spinner");
    });

    rerender(<Display isLoading={false} delayMs={20} minDurationMs={100} />);
    await wait(20);
    rerender(<Display isLoading={true} delayMs={20} minDurationMs={100} />);

    // still within the original minimum-duration window, and now loading again
    await wait(50);
    expect(screen.getByTestId("state")).toHaveTextContent("blocked/spinner");
  });
});
