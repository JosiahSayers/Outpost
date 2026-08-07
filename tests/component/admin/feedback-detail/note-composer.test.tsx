import NoteComposer from "$/frontend/admin/feedback-detail/note-composer";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, mock } from "bun:test";

// Mantine's Textarea autosize hooks into font-loading events; happy-dom
// doesn't implement document.fonts, so stub it to avoid a crash. See
// feedback-drawer.test.tsx for the same pattern.
if (!document.fonts) {
  Object.defineProperty(document, "fonts", {
    value: { addEventListener: () => {}, removeEventListener: () => {} },
    configurable: true,
  });
}

const FEEDBACK_ID = "feedback-1";

function renderComposer() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <NoteComposer feedbackId={FEEDBACK_ID} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("with an empty message", () => {
  it("disables the Post note button", () => {
    renderComposer();
    expect(screen.getByRole("button", { name: "Post note" })).toBeDisabled();
  });
});

describe("posting a note", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("submits the trimmed message as an internal note by default", async () => {
    global.fetch = mock((url: string, options?: RequestInit) => {
      expect(url).toBe(`/admin/feedback/${FEEDBACK_ID}/notes`);
      expect(options?.method).toBe("POST");
      expect(JSON.parse(options?.body as string)).toEqual({
        message: "Reproduced on staging.",
        userFacing: false,
      });
      return Promise.resolve(
        new Response(
          JSON.stringify({
            note: {
              id: "note-1",
              createdAt: new Date().toISOString(),
              message: "Reproduced on staging.",
              userFacing: false,
              admin: null,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }) as unknown as typeof fetch;

    renderComposer();
    fireEvent.change(screen.getByPlaceholderText("Add a note…"), {
      target: { value: "  Reproduced on staging.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post note" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  it("marks the note as visible to the submitter when the checkbox is checked", async () => {
    global.fetch = mock((_url: string, options?: RequestInit) => {
      expect(JSON.parse(options?.body as string)).toEqual({
        message: "Fixed and deployed.",
        userFacing: true,
      });
      return Promise.resolve(
        new Response(
          JSON.stringify({
            note: {
              id: "note-2",
              createdAt: new Date().toISOString(),
              message: "Fixed and deployed.",
              userFacing: true,
              admin: null,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }) as unknown as typeof fetch;

    renderComposer();
    fireEvent.change(screen.getByPlaceholderText("Add a note…"), {
      target: { value: "Fixed and deployed." },
    });
    fireEvent.click(screen.getByLabelText("Visible to submitter"));
    fireEvent.click(screen.getByRole("button", { name: "Post note" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  it("clears the form after a successful post", async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            note: {
              id: "note-3",
              createdAt: new Date().toISOString(),
              message: "Done.",
              userFacing: false,
              admin: null,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    ) as unknown as typeof fetch;

    renderComposer();
    const textarea = screen.getByPlaceholderText("Add a note…");
    fireEvent.change(textarea, { target: { value: "Done." } });
    fireEvent.click(screen.getByRole("button", { name: "Post note" }));

    await waitFor(() => expect(textarea).toHaveValue(""));
    expect(
      screen.getByRole("checkbox", { name: "Visible to submitter" }),
    ).not.toBeChecked();
  });

  it("leaves the message in place when the post fails", async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response(null, { status: 500 })),
    ) as unknown as typeof fetch;

    renderComposer();
    const textarea = screen.getByPlaceholderText("Add a note…");
    fireEvent.change(textarea, { target: { value: "Still investigating." } });
    fireEvent.click(screen.getByRole("button", { name: "Post note" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(textarea).toHaveValue("Still investigating.");
  });
});
