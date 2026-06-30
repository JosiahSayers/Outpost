import PackingListTitle from "$/frontend/packing-list/header/packing-list-title";
import { PackingListProvider } from "$/frontend/packing-list/packing-list-context";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";

function renderComponent(editable: boolean, value = "Summer Trip") {
  render(
    <MantineProvider>
      <PackingListProvider value={{ editable }}>
        <PackingListTitle value={value} />
      </PackingListProvider>
    </MantineProvider>,
  );
}

describe("when not editable", () => {
  beforeEach(() => renderComponent(false));

  it("renders the title as a heading", () => {
    expect(
      screen.getByRole("heading", { name: "Summer Trip" }),
    ).toBeInTheDocument();
  });

  it("clicking does not enter edit mode", () => {
    fireEvent.click(screen.getByRole("heading", { name: "Summer Trip" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("when editable", () => {
  describe("in view mode", () => {
    beforeEach(() => renderComponent(true));

    it("renders the title as a heading", () => {
      expect(
        screen.getByRole("heading", { name: "Summer Trip" }),
      ).toBeInTheDocument();
    });

    it("clicking enters edit mode", () => {
      fireEvent.click(screen.getByRole("heading", { name: "Summer Trip" }));
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  describe("in edit mode", () => {
    beforeEach(() => {
      renderComponent(true);
      fireEvent.click(screen.getByRole("heading", { name: "Summer Trip" }));
    });

    it("shows an input pre-filled with the current value", () => {
      expect(screen.getByRole("textbox")).toHaveValue("Summer Trip");
    });

    it("pressing Enter commits the draft and returns to view mode", () => {
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "Winter Trip" },
      });
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      expect(
        screen.getByRole("heading", { name: "Winter Trip" }),
      ).toBeInTheDocument();
    });

    it("pressing Escape cancels and restores the original value", () => {
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "Winter Trip" },
      });
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
      expect(
        screen.getByRole("heading", { name: "Summer Trip" }),
      ).toBeInTheDocument();
    });

    it("blurring commits the draft", () => {
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "Winter Trip" },
      });
      fireEvent.blur(screen.getByRole("textbox"));
      expect(
        screen.getByRole("heading", { name: "Winter Trip" }),
      ).toBeInTheDocument();
    });
  });
});
