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

export default function UserSearch() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch] = useDebouncedValue(searchInput, 300);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const isWideLayout = useMediaQuery("(min-width: 48em)");

  const { data, isPending, isFetching, isError, error } =
    useAdminUserSearch(debouncedSearch);

  useEffect(() => {
    setSelectedUserId(null);
  }, [debouncedSearch]);

  const results = data?.users ?? [];
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
        onChange={(event) => setSearchInput(event.currentTarget.value)}
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
                onSelect={setSelectedUserId}
                isWideLayout={!!isWideLayout}
              />
            </Box>
          )}

          {selectedUser && (
            <Box style={{ flex: 1, minWidth: 0 }} w="100%">
              {!isWideLayout && (
                <Anchor
                  component="button"
                  type="button"
                  onClick={() => setSelectedUserId(null)}
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
