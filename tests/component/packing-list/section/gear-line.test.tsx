import { AccountSettingsProviderBase } from "$/frontend/account/account-settings-context";
import GearLine from "$/frontend/packing-list/section/gear-line";
import { accountSettingsKeys } from "$/frontend/utils/api/account-settings";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function gear(
  overrides: Partial<ClientGearInventoryItem> = {},
): ClientGearInventoryItem {
  return {
    id: "gear-1",
    name: "Copper Spur UL2",
    quantity: 1,
    grams: 690,
    category: { id: "cat-1", name: "Shelter", public: false },
    ...overrides,
  };
}

// Pins weight display to grams so assertions don't depend on the test
// environment's locale-detected unit (see use-weight-display.test.tsx).
function renderLine(gearItem: ClientGearInventoryItem, quantity: number) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(accountSettingsKeys.all, [
    {
      slug: "weight_viewing_unit",
      name: "Preferred Weight Viewing Unit",
      description: "Unit used to display weight measurements.",
      defaultValue: null,
      value: "grams",
    },
  ]);
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <AccountSettingsProviderBase isAuthenticated>
          <GearLine gear={gearItem} quantity={quantity} />
        </AccountSettingsProviderBase>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("GearLine", () => {
  it("renders the gear's name", () => {
    renderLine(gear(), 1);
    expect(screen.getByText("Copper Spur UL2")).toBeInTheDocument();
  });

  it("multiplies the gear's weight by the packing list quantity", () => {
    renderLine(gear({ grams: 100 }), 3);
    expect(screen.getByText("300 g")).toBeInTheDocument();
  });

  it("shows no weight when the gear has none recorded", () => {
    renderLine(gear({ grams: null }), 1);
    expect(screen.queryByText(/ g$/)).not.toBeInTheDocument();
  });
});
