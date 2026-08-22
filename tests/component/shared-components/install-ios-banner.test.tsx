import InstallIosBanner from "$/frontend/shared-components/install-ios-banner";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const DISMISSED_KEY = "outpost.ios-install-prompt-dismissed";

const defaultUserAgent = navigator.userAgent;

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

function stubUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

function stubStandalone(matches: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: query === "(display-mode: standalone)" && matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

function renderBanner() {
  return render(
    <MantineProvider>
      <InstallIosBanner />
    </MantineProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  stubStandalone(false);
});

afterEach(() => {
  stubUserAgent(defaultUserAgent);
  window.localStorage.clear();
});

it("is hidden on a non-iOS user agent", async () => {
  stubUserAgent(ANDROID_UA);

  renderBanner();

  await waitFor(() =>
    expect(screen.queryByText(/get the full outpost experience/i)).toBeNull(),
  );
});

it("is hidden when already running standalone", async () => {
  stubUserAgent(IPHONE_UA);
  stubStandalone(true);

  renderBanner();

  await waitFor(() =>
    expect(screen.queryByText(/get the full outpost experience/i)).toBeNull(),
  );
});

it("is hidden when previously dismissed", async () => {
  stubUserAgent(IPHONE_UA);
  window.localStorage.setItem(DISMISSED_KEY, "true");

  renderBanner();

  await waitFor(() =>
    expect(screen.queryByText(/get the full outpost experience/i)).toBeNull(),
  );
});

describe("on an iOS Safari tab that hasn't been added to the Home Screen", () => {
  beforeEach(() => {
    stubUserAgent(IPHONE_UA);
  });

  it("is visible and shows the install steps", async () => {
    renderBanner();

    await waitFor(() =>
      expect(
        screen.getByText(/get the full outpost experience/i),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/tap share in safari's toolbar/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/choose "add to home screen"/i),
    ).toBeInTheDocument();
  });

  it("persists dismissal across remount", async () => {
    const { unmount } = renderBanner();

    await waitFor(() =>
      expect(
        screen.getByText(/get the full outpost experience/i),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    await waitFor(() =>
      expect(screen.queryByText(/get the full outpost experience/i)).toBeNull(),
    );
    expect(window.localStorage.getItem(DISMISSED_KEY)).toBe("true");

    unmount();
    renderBanner();

    await waitFor(() =>
      expect(screen.queryByText(/get the full outpost experience/i)).toBeNull(),
    );
  });
});
