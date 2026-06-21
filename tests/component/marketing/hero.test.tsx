import Hero from "$/frontend/marketing/hero";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "bun:test";

beforeEach(() => {
  render(
    <MantineProvider>
      <Hero />
    </MantineProvider>,
  );
});

it("renders the expected title", () => {
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Plan your adventure.Pack with purpose.",
  );
});

it("Renders the expected copy below the title", () => {
  expect(
    screen.getByText(
      "Summit Journal is a backpacking planner that keeps your gear organised, your lists dialled in, and the people back home informed about your whereabouts.",
    ),
  ).toBeInTheDocument();
});

it("renders a 'Get Started' Call to Action that links to the registration page", () => {
  const link = screen.getByRole("link", { name: "Get started" });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute("href", "/register");
});

it("renders a 'Sign In' Call to Action that links to the sign in page", () => {
  const link = screen.getByRole("link", { name: "Sign in" });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute("href", "/sign-in");
});
