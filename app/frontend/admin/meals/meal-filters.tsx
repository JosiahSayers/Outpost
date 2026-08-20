import { useAdminMealsMetadata } from "$/frontend/utils/api/admin-meals";
import { Divider, MultiSelect, Stack, Switch, TextInput } from "@mantine/core";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

interface MealFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  vendor: string[];
  onVendorChange: (value: string[]) => void;
  brand: string[];
  onBrandChange: (value: string[]) => void;
  incompleteOnly: boolean;
  onIncompleteOnlyChange: (value: boolean) => void;
  readyOverrideOnly: boolean;
  onReadyOverrideOnlyChange: (value: boolean) => void;
}

export default function MealFilters({
  search,
  onSearchChange,
  vendor,
  onVendorChange,
  brand,
  onBrandChange,
  incompleteOnly,
  onIncompleteOnlyChange,
  readyOverrideOnly,
  onReadyOverrideOnlyChange,
}: MealFiltersProps) {
  const metadata = useAdminMealsMetadata();
  // brand is nullable on PublicMealItem, so distinct values can include null
  // -- Mantine's MultiSelect data only accepts strings.
  const brandOptions = (metadata.data?.brands ?? []).filter(
    (brand): brand is string => brand !== null,
  );

  return (
    <Stack gap="xs">
      <TextInput
        placeholder="Search by name or product id…"
        leftSection={<MagnifyingGlassIcon size={16} />}
        value={search}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        disabled={incompleteOnly || readyOverrideOnly}
      />
      <MultiSelect
        aria-label="Vendor"
        placeholder="All vendors"
        data={metadata.data?.vendors ?? []}
        value={vendor}
        onChange={onVendorChange}
        searchable
        clearable
        disabled={incompleteOnly || readyOverrideOnly || metadata.isPending}
        nothingFoundMessage="No vendors"
      />
      <MultiSelect
        aria-label="Brand"
        placeholder="All brands"
        data={brandOptions}
        value={brand}
        onChange={onBrandChange}
        searchable
        clearable
        disabled={incompleteOnly || readyOverrideOnly || metadata.isPending}
        nothingFoundMessage="No brands"
      />
      <Divider my={2} />
      <Switch
        label="Incomplete only"
        description="Meals missing brand, calories, water, dry weight, or an image"
        checked={incompleteOnly}
        onChange={(event) =>
          onIncompleteOnlyChange(event.currentTarget.checked)
        }
      />
      <Switch
        label="Manually marked ready"
        description="Items an admin has overridden to appear despite missing fields"
        checked={readyOverrideOnly}
        onChange={(event) =>
          onReadyOverrideOnlyChange(event.currentTarget.checked)
        }
      />
    </Stack>
  );
}
