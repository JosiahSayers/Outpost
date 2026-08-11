import SecurityPanel from "$/frontend/account/security-panel";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { Router } from "wouter";

function renderPanel(search = "") {
  return render(
    <MantineProvider>
      <Router
        hook={() => ["/account/security", () => {}]}
        searchHook={() => search}
      >
        <SecurityPanel />
      </Router>
    </MantineProvider>,
  );
}

function currentPasswordInput() {
  return screen.getByLabelText("Current password");
}

function newPasswordInput() {
  return screen.getByLabelText("New password");
}

function confirmPasswordInput() {
  return screen.getByLabelText("Confirm new password");
}

describe("SecurityPanel", () => {
  it("renders the section heading and all three password fields", () => {
    renderPanel();

    expect(
      screen.getByRole("heading", { level: 3, name: "Security" }),
    ).toBeInTheDocument();
    expect(currentPasswordInput()).toBeInTheDocument();
    expect(newPasswordInput()).toBeInTheDocument();
    expect(confirmPasswordInput()).toBeInTheDocument();
  });

  it("shows a validation error when the current password is empty", async () => {
    renderPanel();

    fireEvent.change(newPasswordInput(), {
      target: { value: "newpassword123" },
    });
    fireEvent.change(confirmPasswordInput(), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() =>
      expect(
        screen.getByText("Please enter your current password"),
      ).toBeInTheDocument(),
    );
  });

  it("shows a validation error when the new password is too short", async () => {
    renderPanel();

    fireEvent.change(currentPasswordInput(), {
      target: { value: "oldpassword123" },
    });
    fireEvent.change(newPasswordInput(), { target: { value: "short" } });
    fireEvent.change(confirmPasswordInput(), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() =>
      expect(
        screen.getByText("Password must be at least 8 characters"),
      ).toBeInTheDocument(),
    );
  });

  it("shows a validation error when the confirmation does not match", async () => {
    renderPanel();

    fireEvent.change(currentPasswordInput(), {
      target: { value: "oldpassword123" },
    });
    fireEvent.change(newPasswordInput(), {
      target: { value: "newpassword123" },
    });
    fireEvent.change(confirmPasswordInput(), {
      target: { value: "somethingelse123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() =>
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument(),
    );
  });

  it("shows the admin MFA banner when redirected here with adminMfaRequired", () => {
    renderPanel("adminMfaRequired=true");

    expect(screen.getByText("Admin access requires MFA")).toBeInTheDocument();
  });

  it("does not show the admin MFA banner otherwise", () => {
    renderPanel();

    expect(
      screen.queryByText("Admin access requires MFA"),
    ).not.toBeInTheDocument();
  });
});
