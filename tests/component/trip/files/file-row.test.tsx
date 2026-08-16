import FileRow from "$/frontend/trip/files/file-row";
import type { ClientFile } from "$/transformers/file";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

let isTouchDevice = false;
window.matchMedia = (query: string) =>
  ({
    matches: query === "(hover: none)" ? isTouchDevice : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

function file(overrides: Partial<ClientFile> = {}): ClientFile {
  return {
    id: "file-1",
    filename: "backcountry-permit.pdf",
    contentType: "application/pdf",
    bytes: 842 * 1024,
    createdAt: new Date("2026-08-03T00:00:00.000Z"),
    ...overrides,
  };
}

function renderRow(f: ClientFile) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <FileRow tripId="trip-1" file={f} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

// The download/delete controls are only visible on hover (or unconditionally
// on touch devices), via `visibility: hidden/visible` on their wrapping
// Group. happy-dom doesn't compute an accessible name for elements inside a
// `visibility: hidden` ancestor even when queried with `{ hidden: true }`, so
// they have to be found by DOM attribute instead of by accessible role/name.
function deleteButton(filename: string) {
  return document.querySelector(
    `[aria-label="Delete ${filename}"]`,
  ) as HTMLButtonElement;
}
function downloadLink(filename: string) {
  return document.querySelector(
    `[aria-label="Download ${filename}"]`,
  ) as HTMLAnchorElement;
}

beforeEach(() => {
  isTouchDevice = false;
  global.fetch = mock(() =>
    Promise.resolve(new Response(null, { status: 200 })),
  ) as unknown as typeof fetch;
});

describe("rendering", () => {
  it("renders the filename, size, and upload date", () => {
    renderRow(file());
    expect(screen.getByText("backcountry-permit.pdf")).toBeInTheDocument();
    expect(screen.getByText(/842 KB/)).toBeInTheDocument();
    expect(screen.getByText(/Uploaded Aug 3/)).toBeInTheDocument();
  });

  it("points the download action at the file's download endpoint", () => {
    renderRow(file({ id: "file-99", filename: "map.jpg" }));
    const download = downloadLink("map.jpg");
    expect(download).toHaveAttribute("href", "/api/trips/trip-1/files/file-99");
    expect(download).toHaveAttribute("target", "_blank");
  });
});

describe("hover reveal of actions", () => {
  it("hides the download/delete controls by default", () => {
    renderRow(file());
    expect(downloadLink("backcountry-permit.pdf")).not.toBeVisible();
  });

  it("reveals the controls unconditionally on touch devices", () => {
    isTouchDevice = true;
    renderRow(file());
    expect(downloadLink("backcountry-permit.pdf")).toBeVisible();
  });
});

describe("deleting", () => {
  it("opens a confirmation modal naming the file", async () => {
    renderRow(file({ filename: "gear-checklist.xlsx" }));
    fireEvent.click(deleteButton("gear-checklist.xlsx"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Delete file?" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent ===
          "Remove gear-checklist.xlsx from this trip? This can't be undone.",
      ),
    ).toBeInTheDocument();
  });

  it("calls the delete API when confirmed", async () => {
    renderRow(file({ id: "file-99", filename: "map.jpg" }));
    fireEvent.click(deleteButton("map.jpg"));
    await waitFor(() => screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/files/file-99");
    expect(init.method).toBe("DELETE");
  });

  it("does not call the delete API when cancelled", async () => {
    renderRow(file());
    fireEvent.click(deleteButton("backcountry-permit.pdf"));
    await waitFor(() => screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
