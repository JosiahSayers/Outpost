import LinkComposer from "$/frontend/trip/links/link-composer";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function renderComposer(existingUrls: string[] = [], onSubmit = mock()) {
  render(
    <MantineProvider>
      <LinkComposer existingUrls={existingUrls} onSubmit={onSubmit} />
    </MantineProvider>,
  );
  return onSubmit;
}

function input() {
  return screen.getByRole("textbox", { name: "Link URL" });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
}

describe("submitting a valid url", () => {
  it("calls onSubmit with the trimmed url", () => {
    const onSubmit = renderComposer();
    fireEvent.change(input(), {
      target: { value: "  https://nps.gov/mora  " },
    });
    submit();
    expect(onSubmit).toHaveBeenCalledWith("https://nps.gov/mora");
  });

  it("assumes https when no protocol is given", () => {
    const onSubmit = renderComposer();
    fireEvent.change(input(), { target: { value: "nps.gov/mora" } });
    submit();
    expect(onSubmit).toHaveBeenCalledWith("https://nps.gov/mora");
  });

  it("clears the input after submitting", () => {
    renderComposer();
    fireEvent.change(input(), { target: { value: "https://nps.gov/mora" } });
    submit();
    expect(input()).toHaveValue("");
  });
});

describe("validation", () => {
  it("rejects an empty url", () => {
    const onSubmit = renderComposer();
    submit();
    expect(screen.getByText("Enter a link to add.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects an unparseable url", () => {
    const onSubmit = renderComposer();
    fireEvent.change(input(), { target: { value: "not a url" } });
    submit();
    expect(
      screen.getByText("Enter a valid link, like https://example.com/trail."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a url with a single-label hostname, matching the backend schema", () => {
    const onSubmit = renderComposer();
    fireEvent.change(input(), { target: { value: "https://google" } });
    submit();
    expect(
      screen.getByText("Enter a valid link, like https://example.com/trail."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a non-http(s) protocol", () => {
    const onSubmit = renderComposer();
    fireEvent.change(input(), {
      target: { value: "ftp://example.com/trail" },
    });
    submit();
    expect(
      screen.getByText("Enter a valid link, like https://example.com/trail."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a url that already exists on the trip", () => {
    const onSubmit = renderComposer(["https://nps.gov/mora"]);
    fireEvent.change(input(), { target: { value: "https://nps.gov/mora" } });
    submit();
    expect(
      screen.getByText("That URL already exists on this trip."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears the error as soon as the url is edited", () => {
    renderComposer(["https://nps.gov/mora"]);
    fireEvent.change(input(), { target: { value: "https://nps.gov/mora" } });
    submit();
    expect(
      screen.getByText("That URL already exists on this trip."),
    ).toBeInTheDocument();

    fireEvent.change(input(), {
      target: { value: "https://nps.gov/olym" },
    });
    expect(
      screen.queryByText("That URL already exists on this trip."),
    ).not.toBeInTheDocument();
  });
});
