import CallToAction from "$/frontend/packing-list/header/call-to-action";
import { PackingListProvider } from "$/frontend/packing-list/packing-list-context";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const onAddSection = mock(() => {});

function renderComponent(editable: boolean) {
  render(
    <MantineProvider>
      <PackingListProvider value={{ editable }}>
        <CallToAction onAddSection={onAddSection} />
      </PackingListProvider>
    </MantineProvider>,
  );
}

beforeEach(() => onAddSection.mockReset());

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
});

describe("when not editable", () => {
  beforeEach(() => renderComponent(false));

  it("renders a 'Copy to my lists' button", () => {
    expect(
      screen.getByRole("button", { name: /copy to my lists/i }),
    ).toBeInTheDocument();
  });

  it("does not render an 'Add section' button", () => {
    expect(
      screen.queryByRole("button", { name: /add section/i }),
    ).not.toBeInTheDocument();
  });
});
