import MfaSection from "$/frontend/account/mfa-section";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function renderSection() {
  return render(
    <MantineProvider>
      <MfaSection />
    </MantineProvider>,
  );
}

describe("MfaSection", () => {
  it("renders the heading and an enable button when not enrolled", () => {
    renderSection();

    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "Two-factor authentication",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enable two-factor authentication" }),
    ).toBeInTheDocument();
  });

  it("shows a password prompt after clicking enable", () => {
    renderSection();

    fireEvent.click(
      screen.getByRole("button", { name: "Enable two-factor authentication" }),
    );

    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();
  });

  it("returns to the idle view when the password step is cancelled", () => {
    renderSection();

    fireEvent.click(
      screen.getByRole("button", { name: "Enable two-factor authentication" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.getByRole("button", { name: "Enable two-factor authentication" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Current password"),
    ).not.toBeInTheDocument();
  });
});
