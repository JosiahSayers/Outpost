import CallToAction from "$/frontend/marketing/call-to-action";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "bun:test";
import { mockHealthFetch } from "../../helpers/mock-health-fetch";

let restoreFetch: () => void;

beforeEach(() => {
  restoreFetch = mockHealthFetch();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <CallToAction />
      </MantineProvider>
    </QueryClientProvider>,
  );
});

afterEach(() => {
  restoreFetch();
});

it("renders the heading", () => {
  expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
    "Ready to start planning?",
  );
});

it("renders the copy", () => {
  expect(
    screen.getByText(
      "Create a free account and have your first trip planned before the weekend.",
    ),
  ).toBeInTheDocument();
});

it("renders a 'Create an account' Call to Action that links to the registration page", () => {
  const link = screen.getByRole("link", { name: "Create an account" });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute("href", "/register");
});

it("renders an 'Already have an account' link to the sign in page", () => {
  const link = screen.getByRole("link", { name: "Already have an account" });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute("href", "/sign-in");
});
