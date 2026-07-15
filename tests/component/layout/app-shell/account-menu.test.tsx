import AccountMenu from "$/frontend/layout/app-shell/account-menu";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

const onSignOut = mock(() => {});
const onNavigate = mock(() => {});

function renderMenu(
  props: Partial<React.ComponentProps<typeof AccountMenu>> = {},
) {
  return render(
    <MantineProvider>
      <Router hook={() => ["/dashboard", () => {}]}>
        <AccountMenu
          name="Josiah Sayers"
          email="josiah.sayers@me.com"
          onSignOut={onSignOut}
          onNavigate={onNavigate}
          {...props}
        />
      </Router>
    </MantineProvider>,
  );
}

beforeEach(() => {
  onSignOut.mockReset();
  onNavigate.mockReset();
});

// The Menu dropdown's contents are only reliably renderable/interactable in a
// real browser here — floating-ui can't compute layout in happy-dom, so the
// portal content is flaky (sometimes present-but-hidden, sometimes not mounted
// at all). Full dropdown coverage (identity, links, appearance, sign out)
// lives in tests/e2e/header.e2e.ts instead; this only covers the trigger.
describe("desktop (not stacked)", () => {
  it("renders a trigger button that toggles aria-expanded on click", () => {
    renderMenu();
    const trigger = document.querySelector('[aria-label="Account menu"]')!;
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});

describe("mobile (stacked)", () => {
  it("shows identity, settings link, appearance control, and sign out without needing a click", () => {
    renderMenu({ stacked: true });

    expect(screen.getByText("Josiah Sayers")).toBeInTheDocument();
    expect(screen.getByText("josiah.sayers@me.com")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Account Settings" }),
    ).toHaveAttribute("href", "/account");
    expect(screen.getByRole("radio", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("selects a new appearance option when clicked", () => {
    renderMenu({ stacked: true });

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
  });

  it("calls onNavigate when Account Settings is clicked", () => {
    renderMenu({ stacked: true });

    fireEvent.click(screen.getByRole("link", { name: "Account Settings" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("calls onSignOut and onNavigate when Sign Out is clicked", () => {
    renderMenu({ stacked: true });

    fireEvent.click(screen.getByText("Sign Out"));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("does not show an Admin link when isAdmin is not set", () => {
    renderMenu({ stacked: true });

    expect(
      screen.queryByRole("link", { name: "Admin" }),
    ).not.toBeInTheDocument();
  });

  it("shows an Admin link to /console when isAdmin is true", () => {
    renderMenu({ stacked: true, isAdmin: true });

    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/console",
    );
  });

  it("calls onNavigate when the Admin link is clicked", () => {
    renderMenu({ stacked: true, isAdmin: true });

    fireEvent.click(screen.getByRole("link", { name: "Admin" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
