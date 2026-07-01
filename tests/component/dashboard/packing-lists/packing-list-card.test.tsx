import PackingListCard from "$/frontend/dashboard/packing-lists/packing-list-card";
import type { ClientPackingList } from "$/transformers/packing-list";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { Router } from "wouter";

function renderComponent(list: ClientPackingList) {
  render(
    <Router hook={() => ["/dashboard", () => {}]}>
      <MantineProvider>
        <PackingListCard list={list} />
      </MantineProvider>
    </Router>,
  );
}

describe("PackingListCard", () => {
  describe("when totalItems equals totalUniqueItems", () => {
    beforeEach(() =>
      renderComponent({
        id: 1,
        name: "Weekend Kit",
        totalItems: 18,
        totalUniqueItems: 18,
        totalSections: 3,
        public: false,
      } as any),
    );

    it("renders the list name", () => {
      expect(screen.getByText("Weekend Kit")).toBeInTheDocument();
    });

    it("renders sections and item count without unique qualifier", () => {
      expect(screen.getByText("3 sections · 18 items")).toBeInTheDocument();
    });

    it("renders the private badge", () => {
      expect(screen.getByText("Private")).toBeInTheDocument();
    });

    it("renders the list name as a link to the packing list page", () => {
      const link = screen.getByRole("link", { name: "Weekend Kit" });
      expect(link).toHaveAttribute("href", "/packing-lists/1");
    });

    it("renders an 'Export PDF' link", () => {
      const link = screen.getByRole("link", { name: /export pdf/i });
      expect(link).toHaveAttribute("href", "/api/packing-lists/1/pdf");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  describe("when totalItems differs from totalUniqueItems", () => {
    beforeEach(() =>
      renderComponent({
        id: 2,
        name: "Emergency Bag",
        totalItems: 12,
        totalUniqueItems: 16,
        totalSections: 2,
        public: true,
      } as any),
    );

    it("renders sections and item count with unique qualifier", () => {
      expect(
        screen.getByText("2 sections · 12 items (16 unique)"),
      ).toBeInTheDocument();
    });

    it("renders the public badge", () => {
      expect(screen.getByText("Public")).toBeInTheDocument();
    });
  });

  describe("when there is only one section", () => {
    beforeEach(() =>
      renderComponent({
        id: 3,
        name: "Day Pack",
        totalItems: 5,
        totalUniqueItems: 5,
        totalSections: 1,
        public: false,
      } as any),
    );

    it("renders singular 'section'", () => {
      expect(screen.getByText("1 section · 5 items")).toBeInTheDocument();
    });
  });
});
