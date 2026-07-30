import {
  DISMISS_ANIMATION_MS,
  useDismissAnimation,
} from "$/frontend/utils/hooks/use-dismiss-animation";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const onComplete = mock((_id: string) => {});

function Display({ id }: { id: string }) {
  const { dismissingIds, beginDismiss } = useDismissAnimation(onComplete);
  return (
    <div>
      <div data-testid="state">
        {dismissingIds.has(id) ? "dismissing" : "idle"}
      </div>
      <button onClick={() => beginDismiss(id)}>Dismiss</button>
    </div>
  );
}

beforeEach(() => {
  onComplete.mockReset();
});

it("marks the id as dismissing immediately, before calling onComplete", () => {
  render(<Display id="1" />);
  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

  expect(screen.getByTestId("state")).toHaveTextContent("dismissing");
  expect(onComplete).not.toHaveBeenCalled();
});

it("calls onComplete and clears the dismissing flag after the animation", async () => {
  render(<Display id="1" />);
  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

  await waitFor(() => expect(onComplete).toHaveBeenCalledWith("1"), {
    timeout: DISMISS_ANIMATION_MS + 500,
  });
  expect(screen.getByTestId("state")).toHaveTextContent("idle");
});

it("does not call onComplete after unmount", async () => {
  const { unmount } = render(<Display id="1" />);
  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  unmount();

  await new Promise((resolve) =>
    setTimeout(resolve, DISMISS_ANIMATION_MS + 100),
  );
  expect(onComplete).not.toHaveBeenCalled();
});
