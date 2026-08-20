import MealDetailPanel from "$/frontend/admin/meals/meal-detail-panel";
import MealFilters from "$/frontend/admin/meals/meal-filters";
import MealResultList from "$/frontend/admin/meals/meal-result-list";
import PrevNextPager from "$/frontend/admin/shared/prev-next-pager";
import {
  useAdminMealsIncomplete,
  useAdminMealsReadyOverride,
  useAdminMealsSearch,
} from "$/frontend/utils/api/admin-meals";
import type { ClientAdminPublicMealItem } from "$/transformers/admin/public-meal-item";
import {
  Anchor,
  Box,
  Button,
  Center,
  Flex,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { ArrowLeftIcon, PlusIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";

const PAGE_SIZE = 15;

interface SearchState {
  searchInput: string;
  vendor: string[];
  brand: string[];
  page: number;
  // The id of the meal open in the detail panel, kept in the URL (rather
  // than only in `panel` below) so a page refresh doesn't lose the
  // selection -- see the hydration effect further down.
  selectedId: string | null;
  // When on, the list is driven by GET /admin/meals/incomplete instead of
  // the search endpoint, and searchInput/vendor/brand are ignored -- see
  // MealFilters, which disables those fields while this is true. Mutually
  // exclusive with readyOverrideOnly below.
  incompleteOnly: boolean;
  // When on, the list is driven by GET /admin/meals/ready-override instead
  // of the search endpoint -- shows items an admin has manually overridden
  // to "ready" despite a remaining gap. Mutually exclusive with
  // incompleteOnly.
  readyOverrideOnly: boolean;
}

function parseSearchState(search: string): SearchState {
  const params = new URLSearchParams(search);
  const page = Number(params.get("page"));
  return {
    searchInput: params.get("search") ?? "",
    vendor: params.getAll("vendor"),
    brand: params.getAll("brand"),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    selectedId: params.get("meal"),
    incompleteOnly: params.get("incomplete") === "1",
    readyOverrideOnly: params.get("readyOverride") === "1",
  };
}

function buildSearchUrl(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.searchInput) params.set("search", state.searchInput);
  state.vendor.forEach((v) => params.append("vendor", v));
  state.brand.forEach((b) => params.append("brand", b));
  if (state.page > 1) params.set("page", String(state.page));
  if (state.selectedId) params.set("meal", state.selectedId);
  if (state.incompleteOnly) params.set("incomplete", "1");
  if (state.readyOverrideOnly) params.set("readyOverride", "1");
  const query = params.toString();
  return query ? `/console/meals?${query}` : "/console/meals";
}

// There's no GET-by-id endpoint for a single meal, so the detail panel is
// driven directly by an item object the list (or a mutation response)
// handed it rather than being re-fetched by id -- `selectedId` above is
// only used to restore that object from the currently loaded page of
// results after a refresh (see the hydration effect below). A create in
// progress has no id yet, so it isn't persisted to the URL at all.
type Panel =
  { mode: "create" } | { mode: "edit"; meal: ClientAdminPublicMealItem } | null;

export default function AdminMeals() {
  const [, navigate] = useLocation();
  // Read only as the seed for the initial state below — after mount, the
  // URL is kept in sync FROM this state (one-way), matching the pattern in
  // admin/user-search/index.tsx.
  const initialSearch = useSearch();
  const [state, setState] = useState<SearchState>(() =>
    parseSearchState(initialSearch),
  );
  const {
    searchInput,
    vendor,
    brand,
    page,
    selectedId,
    incompleteOnly,
    readyOverrideOnly,
  } = state;

  useEffect(() => {
    navigate(buildSearchUrl(state), { replace: true });
  }, [state, navigate]);

  const [panel, setPanel] = useState<Panel>(null);

  const [debouncedSearch] = useDebouncedValue(searchInput, 300);
  const isWideLayout = useMediaQuery("(min-width: 62em)");

  const skip = (page - 1) * PAGE_SIZE;

  const searchResult = useAdminMealsSearch(
    debouncedSearch,
    vendor,
    brand,
    skip,
    PAGE_SIZE,
    { enabled: !incompleteOnly && !readyOverrideOnly },
  );
  const incompleteResult = useAdminMealsIncomplete(skip, PAGE_SIZE, {
    enabled: incompleteOnly,
  });
  const readyOverrideResult = useAdminMealsReadyOverride(skip, PAGE_SIZE, {
    enabled: readyOverrideOnly,
  });

  // incompleteResult and readyOverrideResult share a result shape (paginated
  // via total/pageSize), unlike searchResult (hasMore) -- pagedResult picks
  // between the two paginated views so the branches below don't need to
  // repeat the incompleteOnly/readyOverrideOnly check three times.
  const pagedResult = incompleteOnly
    ? incompleteResult
    : readyOverrideOnly
      ? readyOverrideResult
      : null;

  const { isPending, isFetching, isError } = pagedResult ?? searchResult;

  const results = pagedResult
    ? (pagedResult.data?.items ?? [])
    : (searchResult.data?.items ?? []);
  const hasMore = pagedResult
    ? pagedResult.data
      ? skip + pagedResult.data.items.length < pagedResult.data.total
      : false
    : (searchResult.data?.hasMore ?? false);

  // Restores the panel from a `meal` id in the URL (e.g. on page refresh) by
  // matching it against whatever page of results is currently loaded. If it
  // isn't on this page -- different filters, since deleted, etc. -- this
  // just leaves the panel closed rather than guessing.
  useEffect(() => {
    if (!selectedId || panel) return;
    const match = results.find((item) => item.id === selectedId);
    if (match) setPanel({ mode: "edit", meal: match });
  }, [selectedId, panel, results]);

  function selectMeal(meal: ClientAdminPublicMealItem | null) {
    setPanel(meal ? { mode: "edit", meal } : null);
    setState((current) => ({ ...current, selectedId: meal?.id ?? null }));
  }

  function updateFilters(
    changes: Partial<Pick<SearchState, "searchInput" | "vendor" | "brand">>,
  ) {
    setState({ ...state, ...changes, page: 1 });
  }

  const showList = isWideLayout || !panel;

  return (
    <Stack gap="xl" py="lg" px={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>Public Meals</Title>
          <Text c="dimmed" size="sm">
            Search, curate, and edit the catalog surfaced across meal plans.
          </Text>
        </div>
        <Button
          leftSection={<PlusIcon size={16} />}
          onClick={() => {
            setPanel({ mode: "create" });
            setState((current) => ({ ...current, selectedId: null }));
          }}
        >
          Add meal
        </Button>
      </Group>

      <Flex
        gap="md"
        align="flex-start"
        direction={{ base: "column", md: "row" }}
      >
        {showList && (
          <Box w={{ base: "100%", md: 340 }} style={{ flexShrink: 0 }}>
            <MealFilters
              search={searchInput}
              onSearchChange={(value) => updateFilters({ searchInput: value })}
              vendor={vendor}
              onVendorChange={(value) => updateFilters({ vendor: value })}
              brand={brand}
              onBrandChange={(value) => updateFilters({ brand: value })}
              incompleteOnly={incompleteOnly}
              onIncompleteOnlyChange={(value) =>
                setState((current) => ({
                  ...current,
                  incompleteOnly: value,
                  readyOverrideOnly: value ? false : current.readyOverrideOnly,
                  page: 1,
                }))
              }
              readyOverrideOnly={readyOverrideOnly}
              onReadyOverrideOnlyChange={(value) =>
                setState((current) => ({
                  ...current,
                  readyOverrideOnly: value,
                  incompleteOnly: value ? false : current.incompleteOnly,
                  page: 1,
                }))
              }
            />

            <Paper withBorder mt="sm" p={6} mih={120}>
              {isPending ? (
                <Center py="xl">
                  <Loader size="sm" />
                </Center>
              ) : isError ? (
                <Text ta="center" c="dimmed" py="xl" size="sm">
                  Couldn&rsquo;t load meals.
                </Text>
              ) : results.length === 0 ? (
                <Text ta="center" c="dimmed" py="xl" size="sm">
                  No meals match these filters.
                </Text>
              ) : (
                <MealResultList
                  items={results}
                  selectedId={panel?.mode === "edit" ? panel.meal.id : null}
                  onSelect={selectMeal}
                />
              )}
            </Paper>

            <PrevNextPager
              page={page}
              hasMore={hasMore}
              onPageChange={(next) => setState({ ...state, page: next })}
              disabled={isFetching}
            />
          </Box>
        )}

        {panel && (
          <Box style={{ flex: 1, minWidth: 0 }} w="100%">
            {!isWideLayout && (
              <Anchor
                component="button"
                type="button"
                onClick={() => selectMeal(null)}
                underline="never"
                c="dimmed"
                fw={600}
                fz="sm"
                mb="sm"
                display="inline-flex"
                style={{ alignItems: "center", gap: 6 }}
              >
                <ArrowLeftIcon size={14} />
                Back to results
              </Anchor>
            )}

            <Paper withBorder p="lg">
              <MealDetailPanel
                key={panel.mode === "edit" ? panel.meal.id : "new"}
                meal={panel.mode === "edit" ? panel.meal : null}
                onCreated={selectMeal}
                onUpdated={selectMeal}
                onDeleted={() => selectMeal(null)}
                onCancel={() => selectMeal(null)}
              />
            </Paper>
          </Box>
        )}

        {!panel && isWideLayout && (
          <Box style={{ flex: 1 }}>
            <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
              <Text ta="center" c="dimmed">
                Select a meal from the list, or add a new one.
              </Text>
            </Paper>
          </Box>
        )}
      </Flex>
    </Stack>
  );
}
