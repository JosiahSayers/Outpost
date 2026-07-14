import ProfilePanel from "$/frontend/account/profile-panel";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function renderPanel(
  props: Partial<React.ComponentProps<typeof ProfilePanel>> = {},
) {
  return render(
    <MantineProvider>
      <ProfilePanel
        name="Josiah Sayers"
        email="josiah.sayers@me.com"
        {...props}
      />
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
});
