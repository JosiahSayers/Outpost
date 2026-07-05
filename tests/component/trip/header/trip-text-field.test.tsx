import TripTextField from "$/frontend/trip/header/trip-text-field";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { useState } from "react";

// `TripTextField` is controlled — the displayed text comes from its `value`
// prop (the React Query cache in the real app). This wrapper stands in for
// that owner, updating the value when the field persists an edit.
function renderComponent(
  value: string | null,
  onSave?: (value: string) => void,
) {
  function Wrapper() {
    const [current, setCurrent] = useState<string | null>(value);
    return (
      <MantineProvider>
        <TripTextField
          icon={null}
          value={current}
          placeholder="Add a trail"
          onSave={(next) => {
            onSave?.(next);
            setCurrent(next);
          }}
        />
      </MantineProvider>
    );
  }

  render(<Wrapper />);
}

describe("with a value", () => {
  describe("in view mode", () => {
    beforeEach(() => renderComponent("Wonderland Trail"));

    it("renders the text", () => {
      expect(screen.getByText("Wonderland Trail")).toBeInTheDocument();
    });

    it("clicking enters edit mode", () => {
      fireEvent.click(screen.getByText("Wonderland Trail"));
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  describe("in edit mode", () => {
    beforeEach(() => {
      renderComponent("Wonderland Trail");
      fireEvent.click(screen.getByText("Wonderland Trail"));
    });

    it("shows an input pre-filled with the current value", () => {
      expect(screen.getByRole("textbox")).toHaveValue("Wonderland Trail");
    });

    it("pressing Enter commits the draft and returns to view mode", () => {
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "Pacific Crest Trail" },
      });
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      expect(screen.getByText("Pacific Crest Trail")).toBeInTheDocument();
    });

    it("pressing Escape cancels and restores the original value", () => {
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "Pacific Crest Trail" },
      });
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
      expect(screen.getByText("Wonderland Trail")).toBeInTheDocument();
    });

    it("blurring commits the draft", () => {
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "Pacific Crest Trail" },
      });
      fireEvent.blur(screen.getByRole("textbox"));
      expect(screen.getByText("Pacific Crest Trail")).toBeInTheDocument();
    });
  });

  describe("onSave", () => {
    it("is called with the trimmed value when the draft changes", () => {
      const onSave = mock();
      renderComponent("Wonderland Trail", onSave);
      fireEvent.click(screen.getByText("Wonderland Trail"));
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "  Pacific Crest Trail  " },
      });
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith("Pacific Crest Trail");
    });

    it("is called with an empty string when the field is cleared", () => {
      const onSave = mock();
      renderComponent("Wonderland Trail", onSave);
      fireEvent.click(screen.getByText("Wonderland Trail"));
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "" },
      });
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith("");
    });

    it("is not called when the value is unchanged", () => {
      const onSave = mock();
      renderComponent("Wonderland Trail", onSave);
      fireEvent.click(screen.getByText("Wonderland Trail"));
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      expect(onSave).not.toHaveBeenCalled();
    });

    it("is not called when the edit is cancelled with Escape", () => {
      const onSave = mock();
      renderComponent("Wonderland Trail", onSave);
      fireEvent.click(screen.getByText("Wonderland Trail"));
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "Pacific Crest Trail" },
      });
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
      expect(onSave).not.toHaveBeenCalled();
    });
  });
});

describe("with no value", () => {
  beforeEach(() => renderComponent(null));

  it("renders the placeholder", () => {
    expect(screen.getByText("Add a trail")).toBeInTheDocument();
  });

  it("clicking enters edit mode", () => {
    fireEvent.click(screen.getByText("Add a trail"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
