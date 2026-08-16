import TimeField from "$/frontend/trip/safety-info/time-field";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function renderField(value: string, onSave: (value: string) => void = mock()) {
  render(
    <MantineProvider>
      <TimeField
        icon={null}
        value={value}
        placeholder="Add a time"
        label="Departure time"
        onSave={onSave}
      />
    </MantineProvider>,
  );
}

describe("with a value", () => {
  it("renders the formatted 12-hour time", () => {
    renderField("06:30");
    expect(screen.getByText("6:30 AM")).toBeInTheDocument();
  });

  it("formats an afternoon time with PM", () => {
    renderField("16:00");
    expect(screen.getByText("4:00 PM")).toBeInTheDocument();
  });

  it("clicking enters edit mode with the current value", () => {
    renderField("06:30");
    fireEvent.click(screen.getByText("6:30 AM"));
    expect(screen.getByLabelText("Departure time")).toHaveValue("06:30");
  });

  it("changing the time and blurring commits the new value", () => {
    const onSave = mock();
    renderField("06:30", onSave);
    fireEvent.click(screen.getByText("6:30 AM"));
    fireEvent.change(screen.getByLabelText("Departure time"), {
      target: { value: "16:00" },
    });
    fireEvent.blur(screen.getByLabelText("Departure time"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("16:00");
  });

  it("changing the time and pressing Enter commits the new value", () => {
    const onSave = mock();
    renderField("06:30", onSave);
    fireEvent.click(screen.getByText("6:30 AM"));
    fireEvent.change(screen.getByLabelText("Departure time"), {
      target: { value: "16:00" },
    });
    fireEvent.keyDown(screen.getByLabelText("Departure time"), {
      key: "Enter",
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("16:00");
  });

  it("pressing Escape cancels without calling onSave", () => {
    const onSave = mock();
    renderField("06:30", onSave);
    fireEvent.click(screen.getByText("6:30 AM"));
    fireEvent.change(screen.getByLabelText("Departure time"), {
      target: { value: "16:00" },
    });
    fireEvent.keyDown(screen.getByLabelText("Departure time"), {
      key: "Escape",
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("6:30 AM")).toBeInTheDocument();
  });

  it("blurring without a change does not call onSave", () => {
    const onSave = mock();
    renderField("06:30", onSave);
    fireEvent.click(screen.getByText("6:30 AM"));
    fireEvent.blur(screen.getByLabelText("Departure time"));
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("with no value", () => {
  it("renders the placeholder", () => {
    renderField("");
    expect(screen.getByText("Add a time")).toBeInTheDocument();
  });

  it("clicking enters edit mode", () => {
    renderField("");
    fireEvent.click(screen.getByText("Add a time"));
    expect(screen.getByLabelText("Departure time")).toBeInTheDocument();
  });
});
