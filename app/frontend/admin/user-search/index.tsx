import AdminPagination from "$/frontend/admin/shared/pagination";
import SearchResults from "$/frontend/admin/user-search/search-results";
import LoadingState from "$/frontend/admin/user-search/search-states/loading";
import NoResultsState from "$/frontend/admin/user-search/search-states/no-results";
import PreSearchState from "$/frontend/admin/user-search/search-states/pre-search";
import UserDetailPanel from "$/frontend/admin/user-search/user-detail-panel";
import Error from "$/frontend/shared-components/error";
import { useAdminUserSearch } from "$/frontend/utils/api/admin-users";
import {
  Anchor,
  Box,
  Flex,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { ArrowLeftIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";

const PAGE_SIZE = 10;

interface SearchState {
  searchInput: string;
  selectedUserId: string | null;
  page: number;
}

function parseSearchState(search: string): SearchState {
  const params = new URLSearchParams(search);
  const page = Number(params.get("page"));
  return {
    searchInput: params.get("search") ?? "",
    selectedUserId: params.get("user"),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function buildSearchUrl(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.searchInput) params.set("search", state.searchInput);
  if (state.selectedUserId) params.set("user", state.selectedUserId);
  if (state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  return query ? `/console/users?${query}` : "/console/users";
}

export default function UserSearch() {
  const [, navigate] = useLocation();
  // Read only as the seed for the initial state below — after mount, the
  // URL is kept in sync FROM this state (one-way), not read back reactively,
  // so typing stays instantly responsive rather than round-tripping through
  // the router on every keystroke.
  const initialSearch = useSearch();
  const [state, setState] = useState<SearchState>(() =>
    parseSearchState(initialSearch),
  );
  const { searchInput, selectedUserId, page } = state;

  // Search term, selection, and page live in the URL (rather than only in
  // this state) so that navigating away to view a user's sessions and back
  // restores the page exactly as it was, instead of resetting to blank.
  useEffect(() => {
    navigate(buildSearchUrl(state), { replace: true });
  }, [state, navigate]);

  const [debouncedSearch] = useDebouncedValue(searchInput, 300);
  const isWideLayout = useMediaQuery("(min-width: 48em)");

  const { data, isPending, isFetching, isError, error } = useAdminUserSearch(
    debouncedSearch,
    (page - 1) * PAGE_SIZE,
    PAGE_SIZE,
  );

  const results = data?.users ?? [];
  const total = data?.total ?? 0;
  const selectedUser =
    results.find((user) => user.id === selectedUserId) ?? null;
  const hasSearched = debouncedSearch.length > 0;
  const isLoading = hasSearched && (isPending || isFetching);

  const showList = isWideLayout || !selectedUser;

  return (
    <Stack gap="xl" py="lg" px={{ base: "md", sm: "xl" }}>
      <div>
        <Title order={2}>User Search</Title>
        <Text c="dimmed" size="sm">
          Look up any account by name or email — the entry point for
          impersonation, resets, and sessions.
        </Text>
      </div>

      <TextInput
        placeholder="Search by name or email…"
        leftSection={<MagnifyingGlassIcon size={16} />}
        value={searchInput}
        onChange={(event) =>
          // Changing the search term always clears the selection and resets
          // back to the first page, matching the previous behavior.
          setState({
            searchInput: event.currentTarget.value,
            selectedUserId: null,
            page: 1,
          })
        }
      />

      {!hasSearched && <PreSearchState />}

      {hasSearched && isError && (
        <Error message={error instanceof Error ? error.message : undefined} />
      )}

      {hasSearched && !isError && isLoading && <LoadingState />}

      {hasSearched && !isError && !isLoading && results.length === 0 && (
        <NoResultsState searchTerm={debouncedSearch} />
      )}

      {hasSearched && !isError && !isLoading && results.length > 0 && (
        <Flex
          gap="md"
          align="flex-start"
          direction={{ base: "column", sm: "row" }}
        >
          {showList && (
            <Box
              w={{ base: "100%", sm: selectedUser ? 340 : "100%" }}
              style={{ flexShrink: 0 }}
            >
              <SearchResults
                results={results}
                selectedUserId={selectedUserId}
                onSelect={(userId) =>
                  setState({ searchInput, selectedUserId: userId, page })
                }
                isWideLayout={!!isWideLayout && !selectedUser}
              />
              <AdminPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(newPage) =>
                  setState({ searchInput, selectedUserId, page: newPage })
                }
                disabled={isFetching}
              />
            </Box>
          )}

          {selectedUser && (
            <Box style={{ flex: 1, minWidth: 0 }} w="100%">
              {!isWideLayout && (
                <Anchor
                  component="button"
                  type="button"
                  onClick={() =>
                    setState({ searchInput, selectedUserId: null, page })
                  }
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

              <UserDetailPanel user={selectedUser} />
            </Box>
          )}
        </Flex>
      )}
    </Stack>
  );
}
