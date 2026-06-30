import SectionHeader from "$/frontend/packing-list/section/section-header";
import { PackingListProvider } from "$/frontend/packing-list/packing-list-context";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const onMoveUp = mock(() => {});
const onMoveDown = mock(() => {});
const onRename = mock(() => {});
const onDelete = mock(() => {});

const defaultProps = {
  name: "Sleep system",
  isFirst: false,
  isLast: false,
  onMoveUp,
  onMoveDown,
  onRename,
  onDelete,
  autoEdit: false,
};

function renderHeader(
  editable: boolean,
  overrides: Partial<typeof defaultProps> = {},
) {
  render(
    <MantineProvider>
      <PackingListProvider value={{ editable }}>
        <SectionHeader {...defaultProps} {...overrides} />
      </PackingListProvider>
    </MantineProvider>,
  );
}

// happy-dom doesn't compute accessible names from aria-label on icon-only buttons,
// so we locate the control buttons by their aria-label attribute directly.
function controlButton(label: string) {
  return document.querySelector(`[aria-label="${label}"]`);
}

beforeEach(() => {
  onMoveUp.mockReset();
  onMoveDown.mockReset();
  onRename.mockReset();
  onDelete.mockReset();
});

describe("when not editable", () => {
  beforeEach(() => renderHeader(false));

  it("renders the section name as a heading", () => {
    expect(
      screen.getByRole("heading", { name: "Sleep system" }),
    ).toBeInTheDocument();
  });

  it("does not render any control buttons", () => {
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("when editable", () => {
  describe("in view mode", () => {
    beforeEach(() => renderHeader(true));

    it("renders the section name as a heading", () => {
      expect(
        screen.getByRole("heading", { name: "Sleep system" }),
      ).toBeInTheDocument();
    });

    it("clicking the heading enters edit mode", () => {
      fireEvent.click(screen.getByRole("heading", { name: "Sleep system" }));
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("clicking 'Move section up' calls onMoveUp", () => {
      fireEvent.click(controlButton("Move section up")!);
      expect(onMoveUp).toHaveBeenCalledTimes(1);
    });

    it("clicking 'Move section down' calls onMoveDown", () => {
      fireEvent.click(controlButton("Move section down")!);
      expect(onMoveDown).toHaveBeenCalledTimes(1);
    });
  });

  describe("when isFirst", () => {
    beforeEach(() => renderHeader(true, { isFirst: true }));

    it("disables the 'Move section up' button", () => {
      expect(controlButton("Move section up")).toBeDisabled();
    });
  });

  describe("when isLast", () => {
    beforeEach(() => renderHeader(true, { isLast: true }));

    it("disables the 'Move section down' button", () => {
      expect(controlButton("Move section down")).toBeDisabled();
    });
  });

  describe("delete flow", () => {
    beforeEach(() => renderHeader(true));

    it("clicking 'Delete section' opens a confirmation modal", async () => {
      fireEvent.click(controlButton("Delete section")!);
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: "Delete section?" }),
        ).toBeInTheDocument(),
      );
    });

    it("confirming in the modal calls onDelete", async () => {
      fireEvent.click(controlButton("Delete section")!);
      await waitFor(() => screen.getByRole("button", { name: "Delete" }));
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("when autoEdit is true", () => {
    beforeEach(() => renderHeader(true, { autoEdit: true }));

    it("starts in edit mode immediately", () => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  describe("in edit mode", () => {
    beforeEach(() => {
      renderHeader(true);
      fireEvent.click(screen.getByRole("heading", { name: "Sleep system" }));
    });

    it("shows an input pre-filled with the section name", () => {
      expect(screen.getByRole("textbox")).toHaveValue("Sleep system");
    });

    it("pressing Enter commits and calls onRename with the trimmed value", () => {
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "  Gear  " },
      });
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      expect(onRename).toHaveBeenCalledWith("Gear");
    });

    it("pressing Enter with an empty name does not call onRename", () => {
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      expect(onRename).not.toHaveBeenCalled();
    });

    it("pressing Escape cancels without calling onRename", () => {
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
      expect(onRename).not.toHaveBeenCalled();
      expect(
        screen.getByRole("heading", { name: "Sleep system" }),
      ).toBeInTheDocument();
    });

    it("blurring commits and calls onRename", () => {
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "New name" },
      });
      fireEvent.blur(screen.getByRole("textbox"));
      expect(onRename).toHaveBeenCalledWith("New name");
    });
  });
});
