import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
import {
  Combobox,
  Group,
  Loader,
  Text,
  TextInput,
  type TextInputProps,
  useCombobox,
} from "@mantine/core";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface SearchComboboxProps<T> {
  /** Field label; omit for a bare inline input. */
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  size?: TextInputProps["size"];
  /** Content rendered inside the input's left section (e.g. a field icon). */
  leftSection?: ReactNode;
  autoFocus?: boolean;
  /** Current text in the input. */
  value: string;
  /** Called as the user types. */
  onValueChange: (value: string) => void;
  /** Called when the input loses focus (after the dropdown is closed). */
  onBlur?: () => void;
  /** Called on keydown in the input (e.g. to commit on Enter, cancel on Escape). */
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  results: T[];
  isFetching: boolean;
  /**
   * Query-key prefix for the search this combobox is backed by. When
   * provided, focusing the input invalidates every cached query under this
   * prefix — so results already fetched during the current focus session
   * (e.g. backspacing to a substring searched moments ago) stay instant, but
   * refocusing the field (reopening the drawer, tabbing back in) always
   * forces a fresh fetch instead of trusting a cache that might have gone
   * stale from a mutation elsewhere (e.g. the value just got created).
   */
  searchKeyPrefix?: QueryKey;
  /** Stable, unique string key for an item (also used as the option value). */
  getOptionValue: (item: T) => string;
  /** Called with the picked item when an option is selected. */
  onOptionSubmit: (item: T) => void;
  /**
   * Icon shown at the start of every option row. Pass a function to vary it
   * per item (e.g. a thumbnail when one's available, a fallback glyph
   * otherwise); returning a falsy value omits the icon slot for that row
   * entirely.
   */
  icon: ReactNode | ((item: T) => ReactNode);
  /** Renders the text column of an option (right of the icon). */
  renderOption: (item: T) => ReactNode;
  /**
   * Overrides the default spinner + "Searching…" empty state shown while
   * `isFetching` and no results have arrived yet — e.g. to render skeleton
   * rows shaped like `renderOption`'s output instead.
   */
  renderLoading?: ReactNode;
  /** Shown when a completed search returns no results. */
  emptyMessage: string;
  /**
   * Force-hide the dropdown even when open — e.g. to suppress the empty state
   * until the user has typed a query.
   */
  hidden?: boolean;
  "aria-label"?: string;
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
  size,
  leftSection,
  autoFocus,
  value,
  onValueChange,
  onBlur,
  onKeyDown,
  results,
  isFetching,
  getOptionValue,
  onOptionSubmit,
  icon,
  renderOption,
  renderLoading,
  emptyMessage,
  hidden = false,
  "aria-label": ariaLabel,
  searchKeyPrefix,
}: SearchComboboxProps<T>) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const { isLoading, showSpinner } = useDelayedLoading(isFetching);
  const queryClient = useQueryClient();

  // A freeform commit (Enter/blur in a consumer's onKeyDown/onBlur) typically
  // clears the value without going through onOptionSubmit, which otherwise
  // leaves Mantine's internal dropdown state "open" even though `hidden`
  // hides it visually. That stale open state marks the target with
  // data-mantine-stop-propagation, which swallows a later Escape keypress
  // meant for an ancestor (e.g. a Drawer) instead of letting it bubble. Only
  // close on a non-empty -> empty transition (an actual clear/commit), not
  // whenever the value merely *is* empty — some consumers (e.g. a "copy from
  // a public list" search) intentionally show results for an empty query as
  // soon as the field is focused, and closing unconditionally on every
  // empty-value render fought that open call and re-closed the dropdown.
  const previousValueRef = useRef(value);
  useEffect(() => {
    if (value === "" && previousValueRef.current !== "") {
      combobox.closeDropdown();
    }
    previousValueRef.current = value;
  }, [value, combobox]);

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
          size={size}
          leftSection={leftSection}
          autoFocus={autoFocus}
          value={value}
          aria-label={ariaLabel}
          rightSection={showSpinner ? <Loader size="xs" /> : undefined}
          onChange={(e) => {
            onValueChange(e.currentTarget.value);
            combobox.openDropdown();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => {
            if (searchKeyPrefix) {
              queryClient.invalidateQueries({ queryKey: searchKeyPrefix });
            }
            combobox.openDropdown();
          }}
          onBlur={() => {
            combobox.closeDropdown();
            onBlur?.();
          }}
          onKeyDown={onKeyDown}
        />
      </Combobox.Target>
      <Combobox.Dropdown hidden={hidden}>
        <Combobox.Options>
          {results.map((item) => {
            const resolvedIcon = typeof icon === "function" ? icon(item) : icon;
            return (
              <Combobox.Option
                key={getOptionValue(item)}
                value={getOptionValue(item)}
              >
                <Group gap="xs" wrap="nowrap" align="flex-start">
                  {resolvedIcon && (
                    <span
                      style={{
                        marginTop: 3,
                        flexShrink: 0,
                        display: "inline-flex",
                      }}
                    >
                      {resolvedIcon}
                    </span>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {renderOption(item)}
                  </div>
                </Group>
              </Combobox.Option>
            );
          })}
          {results.length === 0 &&
            (isLoading ? (
              showSpinner ? (
                (renderLoading ?? (
                  <Combobox.Empty>
                    <Group gap="xs" justify="center">
                      <Loader size="xs" />
                      <Text size="sm" c="dimmed">
                        Searching…
                      </Text>
                    </Group>
                  </Combobox.Empty>
                ))
              ) : null
            ) : (
              <Combobox.Empty>{emptyMessage}</Combobox.Empty>
            ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
