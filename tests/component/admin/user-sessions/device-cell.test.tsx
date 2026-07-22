import DeviceCell from "$/frontend/admin/user-sessions/device-cell";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

const CHROME_MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const SAFARI_IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const SAFARI_IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

function renderCell(userAgent: string | null) {
  render(
    <MantineProvider>
      <DeviceCell userAgent={userAgent} />
    </MantineProvider>,
  );
}

describe("a desktop user agent", () => {
  it("shows the parsed browser/OS label and the desktop device class", () => {
    renderCell(CHROME_MAC_UA);

    expect(screen.getByText("Chrome on macOS")).toBeInTheDocument();
    expect(screen.getByText("desktop")).toBeInTheDocument();
  });
});

describe("a mobile user agent", () => {
  it("shows the mobile device class", () => {
    renderCell(SAFARI_IPHONE_UA);

    expect(screen.getByText("Safari on iOS")).toBeInTheDocument();
    expect(screen.getByText("mobile")).toBeInTheDocument();
  });
});

describe("a tablet user agent", () => {
  it("shows the tablet device class", () => {
    renderCell(SAFARI_IPAD_UA);

    expect(screen.getByText("Safari on iOS")).toBeInTheDocument();
    expect(screen.getByText("tablet")).toBeInTheDocument();
  });
});

describe("a missing user agent", () => {
  it("shows an unknown device label", () => {
    renderCell(null);

    expect(screen.getByText("Unknown device")).toBeInTheDocument();
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });
});
