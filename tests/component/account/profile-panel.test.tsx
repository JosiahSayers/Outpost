import ProfilePanel from "$/frontend/account/profile-panel";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { Router } from "wouter";

function renderPanel(
  props: Partial<React.ComponentProps<typeof ProfilePanel>> = {},
  search = "",
) {
  return render(
    <MantineProvider>
      <Router
        hook={() => ["/account/profile", () => {}]}
        searchHook={() => search}
      >
        <ProfilePanel
          name="Josiah Sayers"
          email="josiah.sayers@me.com"
          emailVerified
          {...props}
        />
      </Router>
    </MantineProvider>,
  );
}

describe("ProfilePanel", () => {
  it("renders the section heading", () => {
    renderPanel();
    expect(
      screen.getByRole("heading", { level: 3, name: "Profile" }),
    ).toBeInTheDocument();
  });

  it("renders the given name", () => {
    renderPanel({ name: "Alex Rivera" });
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
  });

  it("renders the given email", () => {
    renderPanel({ email: "alex@example.com" });
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
  });

  it("shows a Verified badge and no resend link when verified", () => {
    renderPanel({ emailVerified: true });
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Resend verification email" }),
    ).not.toBeInTheDocument();
  });

  it("shows an Unverified badge and a resend link when unverified", () => {
    renderPanel({ emailVerified: false });
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resend verification email" }),
    ).toBeInTheDocument();
  });

  it("shows the admin verification banner when redirected here with adminEmailVerificationRequired", () => {
    renderPanel({}, "adminEmailVerificationRequired=true");

    expect(
      screen.getByText("Admin access requires a verified email"),
    ).toBeInTheDocument();
  });

  it("does not show the admin verification banner otherwise", () => {
    renderPanel();

    expect(
      screen.queryByText("Admin access requires a verified email"),
    ).not.toBeInTheDocument();
  });
});
