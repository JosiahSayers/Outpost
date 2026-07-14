import SettingsShell from "$/frontend/account/settings-shell";
import { accountSettingsKeys } from "$/frontend/utils/api/account-settings";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

function renderShell(initialPath = "/account/profile") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData<ClientUserAccountSetting[]>(
    accountSettingsKeys.all,
    [],
  );
  const { hook } = memoryLocation({ path: initialPath });
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Router hook={hook}>
          <Route path="/account/:tab?">
            {(params: { tab?: string }) => (
              <SettingsShell
                name="Josiah Sayers"
                email="josiah.sayers@me.com"
                tab={params.tab}
              />
            )}
          </Route>
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("SettingsShell", () => {
  it("shows the Profile panel by default", () => {
    renderShell();
    expect(
      screen.getByRole("heading", { level: 3, name: "Profile" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Josiah Sayers")).toBeInTheDocument();
  });

  it("switches to the Preferences panel when clicked", () => {
    renderShell();

    fireEvent.click(screen.getByText("Preferences"));

    expect(
      screen.getByRole("heading", { level: 3, name: "Units & Preferences" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: "Profile" }),
    ).not.toBeInTheDocument();
  });

  it("switches back to the Profile panel when clicked", () => {
    renderShell();

    fireEvent.click(screen.getByText("Preferences"));
    fireEvent.click(screen.getByText("Profile"));

    expect(
      screen.getByRole("heading", { level: 3, name: "Profile" }),
    ).toBeInTheDocument();
  });

  it("renders Notifications and Privacy as disabled with a Soon badge", () => {
    renderShell();

    expect(screen.getByText("Notifications").closest("a")).toHaveAttribute(
      "data-disabled",
      "true",
    );
    expect(screen.getByText("Privacy").closest("a")).toHaveAttribute(
      "data-disabled",
      "true",
    );
    expect(screen.getAllByText("Soon")).toHaveLength(2);
  });
});
