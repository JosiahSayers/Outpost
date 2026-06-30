import PackingListDescription from "$/frontend/packing-list/header/packing-list-description";
import { PackingListProvider } from "$/frontend/packing-list/packing-list-context";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";

// Mantine's Textarea autosize hooks into font-loading events; happy-dom doesn't
// implement document.fonts, so stub it to avoid a crash in act-compat.
if (!document.fonts) {
  Object.defineProperty(document, "fonts", {
    value: { addEventListener: () => {}, removeEventListener: () => {} },
    configurable: true,
  });
}

function renderComponent(editable: boolean, value: string | null) {
  render(
    <MantineProvider>
      <PackingListProvider value={{ editable }}>
        <PackingListDescription value={value} />
      </PackingListProvider>
    </MantineProvider>,
  );
}

describe("when not editable", () => {
  describe("with a description", () => {
    beforeEach(() => renderComponent(false, "Pack light, pack right."));

    it("renders the description text", () => {
      expect(screen.getByText("Pack light, pack right.")).toBeInTheDocument();
    });

    it("clicking does not enter edit mode", () => {
      fireEvent.click(screen.getByText("Pack light, pack right."));
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  describe("with no description", () => {
    it("renders nothing", () => {
      renderComponent(false, null);
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByText("Add a description")).not.toBeInTheDocument();
    });
  });
});

describe("when editable", () => {
  describe("with a description", () => {
    describe("in view mode", () => {
      beforeEach(() => renderComponent(true, "Pack light, pack right."));

      it("renders the description text", () => {
        expect(screen.getByText("Pack light, pack right.")).toBeInTheDocument();
      });

      it("clicking enters edit mode", () => {
        fireEvent.click(screen.getByText("Pack light, pack right."));
        expect(screen.getByRole("textbox")).toBeInTheDocument();
      });
    });

    describe("in edit mode", () => {
      beforeEach(() => {
        renderComponent(true, "Pack light, pack right.");
        fireEvent.click(screen.getByText("Pack light, pack right."));
      });

      it("shows a textarea pre-filled with the current value", () => {
        expect(screen.getByRole("textbox")).toHaveValue(
          "Pack light, pack right.",
        );
      });

      it("pressing Enter commits the draft and returns to view mode", () => {
        fireEvent.change(screen.getByRole("textbox"), {
          target: { value: "Updated description" },
        });
        fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
        expect(screen.getByText("Updated description")).toBeInTheDocument();
      });

      it("pressing Shift+Enter does not commit", () => {
        fireEvent.keyDown(screen.getByRole("textbox"), {
          key: "Enter",
          shiftKey: true,
        });
        expect(screen.getByRole("textbox")).toBeInTheDocument();
      });

      it("pressing Escape cancels and restores the original value", () => {
        fireEvent.change(screen.getByRole("textbox"), {
          target: { value: "Updated description" },
        });
        fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
        expect(screen.getByText("Pack light, pack right.")).toBeInTheDocument();
      });

      it("blurring commits the draft with whitespace trimmed", () => {
        fireEvent.change(screen.getByRole("textbox"), {
          target: { value: "  Trimmed  " },
        });
        fireEvent.blur(screen.getByRole("textbox"));
        expect(screen.getByText("Trimmed")).toBeInTheDocument();
      });
    });
  });

  describe("with no description", () => {
    beforeEach(() => renderComponent(true, null));

    it("renders an 'Add a description' placeholder", () => {
      expect(screen.getByText("Add a description")).toBeInTheDocument();
    });

    it("clicking enters edit mode", () => {
      fireEvent.click(screen.getByText("Add a description"));
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });
});
