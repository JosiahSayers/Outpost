import FeedbackDrawer from "$/frontend/layout/app-shell/feedback-drawer";
import { createFeedback } from "$/validation/feedback";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

// Mantine's Textarea autosize hooks into font-loading events; happy-dom doesn't
// implement document.fonts, so stub it to avoid a crash in act-compat.
if (!document.fonts) {
  Object.defineProperty(document, "fonts", {
    value: { addEventListener: () => {}, removeEventListener: () => {} },
    configurable: true,
  });
}

const maxLength = createFeedback.shape.text.maxLength!;
const testPath = "/dashboard/trip-1";

const onClose = mock(() => {});

function textarea() {
  return screen.getByRole("textbox", { name: /^Feedback/ });
}

function renderDrawer(opened = true) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <Router hook={() => [testPath, () => {}]}>
          <FeedbackDrawer opened={opened} onClose={onClose} />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  onClose.mockReset();
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ referenceId: "feedback-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
});

describe("rendering", () => {
  it("renders with an empty textarea", async () => {
    renderDrawer();
    expect(textarea()).toHaveValue("");
    await waitFor(() => {});
  });
});

describe("submitting feedback", () => {
  it("calls the feedback API with the entered text", async () => {
    renderDrawer();

    fireEvent.change(textarea(), {
      target: { value: "This feature would be really helpful for me." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/feedback");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      text: "This feature would be really helpful for me.",
      submittedOnPage: testPath,
    });
  });

  it("shows a thank-you message after a successful submission", async () => {
    renderDrawer();

    fireEvent.change(textarea(), {
      target: { value: "This feature would be really helpful for me." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(
        screen.getByText("Thanks! Someone on the team will take a look."),
      ).toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes and resets after Done is clicked on the thank-you screen", async () => {
    renderDrawer();

    fireEvent.change(textarea(), {
      target: { value: "This feature would be really helpful for me." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => screen.getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not submit when the text is shorter than 15 characters", async () => {
    renderDrawer();

    fireEvent.change(textarea(), { target: { value: "too short" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(textarea()).toBeInvalid());
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows an inline error and does not close when the request fails", async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "Something broke" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as unknown as typeof fetch;
    renderDrawer();

    fireEvent.change(textarea(), {
      target: { value: "This feature would be really helpful for me." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(
        screen.getByText("Couldn't submit your feedback. Please try again."),
      ).toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("character counter", () => {
  // The counter only appears once the text is "getting long" — a fraction of
  // maxLength rather than a fixed number, so this stays correct if maxLength
  // ever changes.
  const threshold = maxLength * 0.75;

  it("does not show a character count while the text is short", () => {
    renderDrawer();
    const length = Math.floor(threshold) - 1;

    fireEvent.change(textarea(), { target: { value: "a".repeat(length) } });

    expect(
      screen.queryByText(`${length}/${maxLength}`),
    ).not.toBeInTheDocument();
  });

  it("shows a character count once the text passes the threshold", () => {
    renderDrawer();
    const length = Math.ceil(threshold) + 1;

    fireEvent.change(textarea(), { target: { value: "a".repeat(length) } });

    expect(screen.getByText(`${length}/${maxLength}`)).toBeInTheDocument();
  });
});

describe("cancelling", () => {
  it("calls onClose when Cancel is clicked", async () => {
    renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
