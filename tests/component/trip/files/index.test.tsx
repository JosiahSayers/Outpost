import Files from "$/frontend/trip/files";
import type { ClientFile } from "$/transformers/file";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

window.matchMedia = (query: string) =>
  ({
    matches: false,
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

function renderFiles(props: { files: ClientFile[]; canUpload: boolean }) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <Files
          tripId="trip-1"
          files={props.files}
          canUpload={props.canUpload}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ file: file({ id: "file-2" }) }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
});

describe("uploads enabled", () => {
  it("shows the drop zone", () => {
    renderFiles({ files: [], canUpload: true });
    expect(
      screen.getByText("Drop a file here, or click to browse"),
    ).toBeInTheDocument();
  });

  it("does not show the disabled-uploads notice", () => {
    renderFiles({ files: [], canUpload: true });
    expect(
      screen.queryByText(/Uploads are turned off/),
    ).not.toBeInTheDocument();
  });

  it("uploads a file dropped on the zone", async () => {
    renderFiles({ files: [], canUpload: true });

    const dropped = new File(["contents"], "map.jpg", { type: "image/jpeg" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [dropped] } });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/files");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
  });
});

describe("uploads disabled", () => {
  it("shows a notice instead of the drop zone", () => {
    renderFiles({ files: [file()], canUpload: false });
    expect(
      screen.getByText(/Uploads are turned off for your account/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Drop a file here, or click to browse"),
    ).not.toBeInTheDocument();
  });

  it("still lists existing files", () => {
    renderFiles({ files: [file()], canUpload: false });
    expect(screen.getByText("backcountry-permit.pdf")).toBeInTheDocument();
  });
});

describe("file list", () => {
  it("renders a row per file", () => {
    renderFiles({
      files: [
        file({ id: "file-1" }),
        file({ id: "file-2", filename: "map.jpg" }),
      ],
      canUpload: true,
    });
    expect(screen.getByText("backcountry-permit.pdf")).toBeInTheDocument();
    expect(screen.getByText("map.jpg")).toBeInTheDocument();
  });
});
