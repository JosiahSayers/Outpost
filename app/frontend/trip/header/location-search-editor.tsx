import SearchCombobox from "$/frontend/shared-components/search-combobox";
import type { EditorProps } from "$/frontend/trip/header/trip-text-field";
import { usePlacesSearch } from "$/frontend/utils/api/places";
import { Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { MapPinIcon } from "@phosphor-icons/react";

/**
 * Edit-mode input for the trip location field: a places-search autocomplete
 * wired into `TripTextField`'s commit logic. Selecting a suggestion commits the
 * formatted place name; typing freeform and blurring / pressing Enter commits
 * the draft.
 */
export default function LocationSearchEditor({
  icon,
  draft,
  setDraft,
  commit,
  cancel,
}: EditorProps) {
  const [debouncedQuery] = useDebouncedValue(draft, 200);
  const placesSearch = usePlacesSearch(debouncedQuery);
  const results = placesSearch.data ?? [];

  return (
    <SearchCombobox
      size="sm"
      leftSection={icon}
      autoFocus
      placeholder="Add a location"
      value={draft}
      onValueChange={setDraft}
      onBlur={() => commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
      }}
      results={results}
      isFetching={placesSearch.isFetching}
      getOptionValue={(place) => String(place.id)}
      onOptionSubmit={(place) =>
        commit(place.state ? `${place.name}, ${place.state}` : place.name)
      }
      icon={<MapPinIcon size={16} color="var(--mantine-color-trail-green-6)" />}
      renderOption={(place) => (
        <>
          <Text size="sm" fw={600} lineClamp={1}>
            {place.name}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {place.state}
          </Text>
        </>
      )}
      emptyMessage="No places found"
      hidden={debouncedQuery.length === 0}
    />
  );
}
