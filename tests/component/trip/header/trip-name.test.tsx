import TripName from "$/frontend/trip/header/trip-name";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import { useState } from "react";

// `TripName` is controlled — the displayed name comes from its `value` prop
// (the React Query cache in the real app). This wrapper stands in for that
// owner, updating the value when the name persists an edit.
function renderComponent(
  value = "Summer Trip",
  onSave?: (name: string) => void,
) {
  function Wrapper() {
    const [current, setCurrent] = useState(value);
    return (
      <MantineProvider>
        <TripName
          value={current}
          onSave={(name) => {
            onSave?.(name);
            setCurrent(name);
          }}
        />
      </MantineProvider>
    );
  }

  render(<Wrapper />);
}

describe("in view mode", () => {
  it("renders the name as a heading", () => {
    renderComponent();
    expect(
      screen.getByRole("heading", { name: "Summer Trip" }),
    ).toBeInTheDocument();
  });

  it("clicking enters edit mode", () => {
    renderComponent();
    fireEvent.click(screen.getByRole("heading", { name: "Summer Trip" }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});

describe("in edit mode", () => {
  function enterEditMode() {
    renderComponent();
    fireEvent.click(screen.getByRole("heading", { name: "Summer Trip" }));
  }

  it("shows an input pre-filled with the current value", () => {
    enterEditMode();
    expect(screen.getByRole("textbox")).toHaveValue("Summer Trip");
  });

  it("pressing Enter commits the draft and returns to view mode", () => {
    enterEditMode();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Winter Trip" },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(
      screen.getByRole("heading", { name: "Winter Trip" }),
    ).toBeInTheDocument();
  });

  it("pressing Escape cancels and restores the original value", () => {
    enterEditMode();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Winter Trip" },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(
      screen.getByRole("heading", { name: "Summer Trip" }),
    ).toBeInTheDocument();
  });

  it("blurring commits the draft", () => {
    enterEditMode();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Winter Trip" },
    });
    fireEvent.blur(screen.getByRole("textbox"));
    expect(
      screen.getByRole("heading", { name: "Winter Trip" }),
    ).toBeInTheDocument();
  });
});

describe("onSave", () => {
  it("is called with the trimmed name when the draft changes", () => {
    const onSave = mock();
    renderComponent("Summer Trip", onSave);
    fireEvent.click(screen.getByRole("heading", { name: "Summer Trip" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  Winter Trip  " },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("Winter Trip");
  });

  it("is not called when the value is unchanged", () => {
    const onSave = mock();
    renderComponent("Summer Trip", onSave);
    fireEvent.click(screen.getByRole("heading", { name: "Summer Trip" }));
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("is not called when the draft is emptied", () => {
    const onSave = mock();
    renderComponent("Summer Trip", onSave);
    fireEvent.click(screen.getByRole("heading", { name: "Summer Trip" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "   " },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("is not called when the edit is cancelled with Escape", () => {
    const onSave = mock();
    renderComponent("Summer Trip", onSave);
    fireEvent.click(screen.getByRole("heading", { name: "Summer Trip" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Winter Trip" },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(onSave).not.toHaveBeenCalled();
  });
});
