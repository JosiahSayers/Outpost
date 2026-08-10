import { useAdminMealsMetadata } from "$/frontend/utils/api/admin-meals";
import { MultiSelect, Stack, TextInput } from "@mantine/core";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

interface MealFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  vendor: string[];
  onVendorChange: (value: string[]) => void;
  brand: string[];
  onBrandChange: (value: string[]) => void;
}

export default function MealFilters({
  search,
  onSearchChange,
  vendor,
  onVendorChange,
  brand,
  onBrandChange,
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
      />
      <MultiSelect
        aria-label="Vendor"
        placeholder="All vendors"
        data={metadata.data?.vendors ?? []}
        value={vendor}
        onChange={onVendorChange}
        searchable
        clearable
        disabled={metadata.isPending}
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
        disabled={metadata.isPending}
        nothingFoundMessage="No brands"
      />
    </Stack>
  );
}
