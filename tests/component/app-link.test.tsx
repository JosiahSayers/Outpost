import AppLink from "$/frontend/app-link";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { Router } from "wouter";

describe("when the current route does not match the link href", () => {
  beforeEach(() => {
    render(
      <MantineProvider>
        <Router hook={() => ["/other", () => {}]}>
          <AppLink href="/sign-in">Sign in</AppLink>
        </Router>
      </MantineProvider>,
    );
  });

  it("renders as a link with the correct href", () => {
    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/sign-in");
    expect(link).toHaveAttribute("data-underline", "hover");
    expect(link).toHaveStyle("font-weight: normal");
  });
});

describe("when the current route matches the link href", () => {
  beforeEach(() => {
    render(
      <MantineProvider>
        <Router hook={() => ["/sign-in", () => {}]}>
          <AppLink href="/sign-in">Sign in</AppLink>
        </Router>
      </MantineProvider>,
    );
  });

  it("renders as a link with the correct href", () => {
    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/sign-in");
    expect(link).toHaveAttribute("data-underline", "always");
    expect(link).toHaveStyle("font-weight: bold");
  });
});
