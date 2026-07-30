import NotificationBell from "$/frontend/layout/app-shell/notification-bell";
import { notificationKeys } from "$/frontend/utils/api/notifications";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { it, expect } from "bun:test";
import { Router } from "wouter";

// Like account-menu.test.tsx, the Menu.Dropdown's contents can't be reliably
// rendered/interacted with in happy-dom (floating-ui needs a real layout
// engine) — this only covers the trigger. Dropdown content itself is covered
// by notification-panel-content.test.tsx directly.
function renderBell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(
    notificationKeys.list({ read: false, dismissed: false, take: 1 }),
    { notifications: [], total: 2, pageSize: 1 },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Router hook={() => ["/dashboard", () => {}]}>
          <NotificationBell />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

it("renders a trigger button that toggles aria-expanded on click", () => {
  renderBell();
  const trigger = document.querySelector('[aria-label="Notifications"]')!;
  expect(trigger).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(trigger);

  expect(trigger).toHaveAttribute("aria-expanded", "true");
});

it("shows the unread count as a badge", () => {
  renderBell();
  expect(screen.getByText("2")).toBeInTheDocument();
});
