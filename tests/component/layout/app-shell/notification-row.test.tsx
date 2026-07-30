import NotificationRow from "$/frontend/layout/app-shell/notification-row";
import type { ClientNotification } from "$/transformers/notification";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

const onOpen = mock(() => {});
const onDismiss = mock(() => {});
const navigate = mock((_to: string) => {});

function makeNotification(
  overrides: Partial<ClientNotification> = {},
): ClientNotification {
  return {
    id: "1",
    title: "Rae added 4 gear items to the shared list",
    description: null,
    icon: null,
    referenceUrl: null,
    read: false,
    dismissed: false,
    createdAt: new Date(Date.now() - 12 * 60 * 1000),
    ...overrides,
  };
}

function renderRow(overrides: Partial<ClientNotification> = {}) {
  render(
    <MantineProvider>
      <Router hook={() => ["/dashboard", navigate]}>
        <NotificationRow
          notification={makeNotification(overrides)}
          onOpen={onOpen}
          onDismiss={onDismiss}
        />
      </Router>
    </MantineProvider>,
  );
}

function getRow(title = "Rae added 4 gear items to the shared list") {
  return screen.getByText(title);
}

beforeEach(() => {
  onOpen.mockReset();
  onDismiss.mockReset();
  navigate.mockReset();
});

it("renders the title and relative time", () => {
  renderRow();
  expect(
    screen.getByText("Rae added 4 gear items to the shared list"),
  ).toBeInTheDocument();
  expect(screen.getByText("12m ago")).toBeInTheDocument();
});

it("renders a description when present", () => {
  renderRow({ description: "Tent stakes and a water filter." });
  expect(
    screen.getByText("Tent stakes and a water filter."),
  ).toBeInTheDocument();
});

it("does not render a description when absent", () => {
  renderRow();
  expect(screen.queryByText(/tent stakes/i)).not.toBeInTheDocument();
});

describe("when there is a referenceUrl", () => {
  it("calls onOpen and navigates there when clicked", () => {
    renderRow({ referenceUrl: "/trips/42" });
    fireEvent.click(getRow());
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0]?.[0]).toBe("/trips/42");
  });
});

describe("when there is no referenceUrl", () => {
  it("calls onOpen without navigating when clicked", () => {
    renderRow();
    fireEvent.click(getRow());
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("dismiss control", () => {
  it("calls onDismiss and not onOpen when clicked", () => {
    renderRow({ referenceUrl: "/trips/42" });
    // The dismiss button is hover-revealed (visibility: hidden at rest), and
    // that suppresses its accessible name in happy-dom's role query even with
    // `hidden: true` — so target it by attribute instead of accessible name.
    const dismissButton = document.querySelector(
      '[aria-label="Dismiss notification"]',
    )!;
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
