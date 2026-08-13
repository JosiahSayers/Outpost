import BottomNavLink from "$/frontend/admin/shell/bottom-nav-link";
import type { AdminNavItem } from "$/frontend/admin/shell/nav-items";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GaugeIcon } from "@phosphor-icons/react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Router } from "wouter";
import { mockHealthFetch } from "../../../helpers/mock-health-fetch";

let restoreFetch: () => void;

beforeEach(() => {
  restoreFetch = mockHealthFetch();
});

afterEach(() => {
  restoreFetch();
});

const baseItem: AdminNavItem = {
  label: "Overview",
  href: "/console",
  icon: GaugeIcon,
};

function renderComponent(item: AdminNavItem, path = "/console") {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Router hook={() => [path, () => {}]}>
        <MantineProvider>
          <BottomNavLink item={item} />
        </MantineProvider>
      </Router>
    </QueryClientProvider>,
  );
}

describe("BottomNavLink", () => {
  it("labels the Overview item 'Home'", () => {
    renderComponent(baseItem);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("labels other items with their own label", () => {
    renderComponent({ ...baseItem, label: "User Search" });

    expect(screen.getByText("User Search")).toBeInTheDocument();
  });

  describe("when the item is coming soon", () => {
    beforeEach(() => renderComponent({ ...baseItem, comingSoon: true }));

    it("does not render a link", () => {
      const anchor = screen.getByText("Home").closest("a");
      expect(anchor).not.toBeInTheDocument();
    });
  });

  describe("when the item is internal", () => {
    beforeEach(() => renderComponent({ ...baseItem, href: "/console/users" }));

    it("links to the item's href", () => {
      const anchor = screen.getByText("Home").closest("a");
      expect(anchor).toHaveAttribute("href", "/console/users");
    });
  });

  describe("when the item is external", () => {
    beforeEach(() =>
      renderComponent({
        ...baseItem,
        href: "/admin/queues",
        external: true,
      }),
    );

    it("links to the item's external href", () => {
      const anchor = screen.getByText("Home").closest("a");
      expect(anchor).toHaveAttribute("href", "/admin/queues");
    });
  });
});
