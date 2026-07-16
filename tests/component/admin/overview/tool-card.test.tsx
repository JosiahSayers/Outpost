import ToolCard from "$/frontend/admin/overview/tool-card";
import type { AdminNavItem } from "$/frontend/admin/shell/nav-items";
import { MantineProvider } from "@mantine/core";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { Router } from "wouter";

const baseTool: AdminNavItem = {
  label: "User Search",
  href: "/console/users",
  icon: MagnifyingGlassIcon,
  description: "Look up any account by name or email.",
};

function renderComponent(tool: AdminNavItem, isPrimary: boolean) {
  render(
    <Router hook={() => ["/console", () => {}]}>
      <MantineProvider>
        <ToolCard tool={tool} isPrimary={isPrimary} />
      </MantineProvider>
    </Router>,
  );
}

describe("ToolCard", () => {
  describe("when the tool is available", () => {
    beforeEach(() =>
      renderComponent({ ...baseTool, comingSoon: false }, false),
    );

    it("renders the label", () => {
      expect(screen.getByText("User Search")).toBeInTheDocument();
    });

    it("renders the description", () => {
      expect(
        screen.getByText("Look up any account by name or email."),
      ).toBeInTheDocument();
    });

    it("does not render a badge", () => {
      expect(screen.queryByText("Soon")).not.toBeInTheDocument();
      expect(screen.queryByText("Up next")).not.toBeInTheDocument();
    });

    it("links to the tool's href", () => {
      const anchor = screen.getByText("User Search").closest("a");
      expect(anchor).toHaveAttribute("href", "/console/users");
    });
  });

  describe("when the tool is coming soon and not primary", () => {
    beforeEach(() => renderComponent({ ...baseTool, comingSoon: true }, false));

    it("renders a 'Soon' badge", () => {
      expect(screen.getByText("Soon")).toBeInTheDocument();
      expect(screen.queryByText("Up next")).not.toBeInTheDocument();
    });

    it("does not render an anchor", () => {
      const anchor = screen.getByText("User Search").closest("a");
      expect(anchor).not.toBeInTheDocument();
    });
  });

  describe("when the tool is coming soon and primary", () => {
    beforeEach(() => renderComponent({ ...baseTool, comingSoon: true }, true));

    it("renders an 'Up next' badge", () => {
      expect(screen.getByText("Up next")).toBeInTheDocument();
      expect(screen.queryByText("Soon")).not.toBeInTheDocument();
    });
  });

  describe("when the tool is external", () => {
    beforeEach(() =>
      renderComponent(
        {
          ...baseTool,
          href: "/admin/queues",
          comingSoon: false,
          external: true,
        },
        false,
      ),
    );

    it("links to the external href", () => {
      const anchor = screen.getByText("User Search").closest("a");
      expect(anchor).toHaveAttribute("href", "/admin/queues");
    });
  });
});
