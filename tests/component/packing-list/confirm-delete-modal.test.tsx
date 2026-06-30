import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const onClose = mock(() => {});
const onConfirm = mock(() => {});

function renderModal(
  props: Partial<Parameters<typeof ConfirmDeleteModal>[0]> = {},
) {
  render(
    <MantineProvider>
      <ConfirmDeleteModal
        opened={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete section?"
        {...props}
      >
        This action cannot be undone.
      </ConfirmDeleteModal>
    </MantineProvider>,
  );
}

beforeEach(() => {
  onClose.mockReset();
  onConfirm.mockReset();
});

describe("when opened is true", () => {
  beforeEach(() => renderModal());

  it("renders the title", () => {
    expect(screen.getByText("Delete section?")).toBeInTheDocument();
  });

  it("renders the children content", () => {
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();
  });

  it("renders a Cancel button", () => {
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders a Delete button by default", () => {
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});

describe("when opened is false", () => {
  it("does not render the modal content", () => {
    renderModal({ opened: false });
    expect(screen.queryByText("Delete section?")).not.toBeInTheDocument();
  });
});

describe("when confirmLabel is provided", () => {
  it("renders the custom label on the confirm button", () => {
    renderModal({ confirmLabel: "Remove" });
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});

describe("clicking Cancel", () => {
  beforeEach(() => renderModal());

  it("calls onClose", () => {
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onConfirm", () => {
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("clicking Delete", () => {
  beforeEach(() => renderModal());

  it("calls onConfirm", () => {
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose", () => {
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
