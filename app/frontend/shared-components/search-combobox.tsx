import {
  Combobox,
  Group,
  Loader,
  Text,
  TextInput,
  useCombobox,
} from "@mantine/core";
import type { ReactNode } from "react";

export interface SearchComboboxProps<T> {
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  /** Current text in the input. */
  value: string;
  /** Called as the user types. */
  onValueChange: (value: string) => void;
  results: T[];
  isFetching: boolean;
  /** Stable, unique string key for an item (also used as the option value). */
  getOptionValue: (item: T) => string;
  /** Called with the picked item when an option is selected. */
  onOptionSubmit: (item: T) => void;
  /** Icon shown at the start of every option row. */
  icon: ReactNode;
  /** Renders the text column of an option (right of the icon). */
  renderOption: (item: T) => ReactNode;
  /** Shown when a completed search returns no results. */
  emptyMessage: string;
  /**
   * Force-hide the dropdown even when open — e.g. to suppress the empty state
   * until the user has typed a query.
   */
  hidden?: boolean;
}

/**
 * A debounced-search autocomplete: a text input backed by a Combobox dropdown
 * of results, with a loading affordance and searching/empty states. The parent
 * owns the query state and the data-fetching hook, passing `results` /
 * `isFetching` in; this keeps the previous results rendered across refetches so
 * the dropdown doesn't flash between keystrokes.
 */
export default function SearchCombobox<T>({
  label,
  placeholder,
  description,
  required,
  value,
  onValueChange,
  results,
  isFetching,
  getOptionValue,
  onOptionSubmit,
  icon,
  renderOption,
  emptyMessage,
  hidden = false,
}: SearchComboboxProps<T>) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        const item = results.find((r) => getOptionValue(r) === val);
        if (item) onOptionSubmit(item);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <TextInput
          label={label}
          placeholder={placeholder}
          description={description}
          required={required}
          value={value}
          rightSection={isFetching ? <Loader size="xs" /> : undefined}
          onChange={(e) => {
            onValueChange(e.currentTarget.value);
            combobox.openDropdown();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
        />
      </Combobox.Target>
      <Combobox.Dropdown hidden={hidden}>
        <Combobox.Options>
          {results.map((item) => (
            <Combobox.Option
              key={getOptionValue(item)}
              value={getOptionValue(item)}
            >
              <Group gap="xs" wrap="nowrap" align="flex-start">
                <span
                  style={{
                    marginTop: 3,
                    flexShrink: 0,
                    display: "inline-flex",
                  }}
                >
                  {icon}
                </span>
                <div style={{ minWidth: 0 }}>{renderOption(item)}</div>
              </Group>
            </Combobox.Option>
          ))}
          {results.length === 0 &&
            (isFetching ? (
              <Combobox.Empty>
                <Group gap="xs" justify="center">
                  <Loader size="xs" />
                  <Text size="sm" c="dimmed">
                    Searching…
                  </Text>
                </Group>
              </Combobox.Empty>
            ) : (
              <Combobox.Empty>{emptyMessage}</Combobox.Empty>
            ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
