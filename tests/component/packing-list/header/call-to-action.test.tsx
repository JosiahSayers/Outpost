import CallToAction from "$/frontend/packing-list/header/call-to-action";
import { PackingListProvider } from "$/frontend/packing-list/packing-list-context";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const onAddSection = mock(() => {});
const onDelete = mock(() => {});
const onCopy = mock(() => {});

function renderComponent(editable: boolean, listId = 42) {
  render(
    <MantineProvider>
      <PackingListProvider value={{ editable }}>
        <CallToAction
          listId={listId}
          onAddSection={onAddSection}
          onDelete={onDelete}
          onCopy={onCopy}
        />
      </PackingListProvider>
    </MantineProvider>,
  );
}

beforeEach(() => {
  onAddSection.mockReset();
  onDelete.mockReset();
  onCopy.mockReset();
});

describe("Export PDF", () => {
  it("renders in editable mode with the correct href", () => {
    renderComponent(true, 7);
    const link = screen.getByRole("link", { name: /export pdf/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/api/packing-lists/7/pdf");
  });

  it("renders in non-editable mode with the correct href", () => {
    renderComponent(false, 99);
    const link = screen.getByRole("link", { name: /export pdf/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/api/packing-lists/99/pdf");
  });
});

describe("when editable", () => {
  beforeEach(() => renderComponent(true));

  it("renders an 'Add section' button", () => {
    expect(
      screen.getByRole("button", { name: /add section/i }),
    ).toBeInTheDocument();
  });

  it("calls onAddSection when clicked", () => {
    fireEvent.click(screen.getByRole("button", { name: /add section/i }));
    expect(onAddSection).toHaveBeenCalledTimes(1);
  });

  it("does not render a 'Copy to my lists' button", () => {
    expect(
      screen.queryByRole("button", { name: /copy to my lists/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a 'Delete list' button", () => {
    expect(
      screen.getByRole("button", { name: /delete list/i }),
    ).toBeInTheDocument();
  });

  it("calls onDelete when the delete button is clicked", () => {
    fireEvent.click(screen.getByRole("button", { name: /delete list/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("when not editable", () => {
  beforeEach(() => renderComponent(false));

  it("renders a 'Copy to my lists' button", () => {
    expect(
      screen.getByRole("button", { name: /copy to my lists/i }),
    ).toBeInTheDocument();
  });

  it("calls onCopy when clicked", () => {
    fireEvent.click(screen.getByRole("button", { name: /copy to my lists/i }));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("does not render an 'Add section' button", () => {
    expect(
      screen.queryByRole("button", { name: /add section/i }),
    ).not.toBeInTheDocument();
  });

  it("does not render a 'Delete list' button", () => {
    expect(
      screen.queryByRole("button", { name: /delete list/i }),
    ).not.toBeInTheDocument();
  });
});
