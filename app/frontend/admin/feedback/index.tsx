import AdminPagination from "$/frontend/admin/shared/pagination";
import FeedbackStatusBadge from "$/frontend/admin/feedback/status-badge";
import {
  ACTIONABLE_STATUSES,
  ALL_STATUSES,
} from "$/frontend/admin/feedback/status";
import StatusFilter from "$/frontend/admin/feedback/status-filter";
import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import { useAdminFeedbackList } from "$/frontend/utils/api/admin-feedback";
import { formatShortDate } from "$/frontend/utils/format-short-date";
import { getInitials } from "$/frontend/utils/get-initials";
import {
  Avatar,
  Badge,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import type { FeedbackStatus } from "../../../../generated/prisma/enums";

const PAGE_SIZE = 10;

interface SearchState {
  status: FeedbackStatus[];
  page: number;
}

function sameStatuses(a: FeedbackStatus[], b: FeedbackStatus[]): boolean {
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return (
    sortedA.length === sortedB.length &&
    sortedA.every((status, i) => status === sortedB[i])
  );
}

function parseSearchState(search: string): SearchState {
  const params = new URLSearchParams(search);
  const status = params
    .getAll("status")
    .filter((s): s is FeedbackStatus => (ALL_STATUSES as string[]).includes(s));
  const page = Number(params.get("page"));
  return {
    status: status.length > 0 ? status : ACTIONABLE_STATUSES,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function buildSearchUrl(state: SearchState): string {
  const params = new URLSearchParams();
  // Omit the status params entirely when they match the default filter, so
  // a first-time visit still gets a clean "/console/feedback" URL.
  if (!sameStatuses(state.status, ACTIONABLE_STATUSES)) {
    state.status.forEach((s) => params.append("status", s));
  }
  if (state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  return query ? `/console/feedback?${query}` : "/console/feedback";
}

export default function FeedbackList() {
  const [, navigate] = useLocation();
  // Read only as the seed for the initial state below — after mount, the
  // URL is kept in sync FROM this state (one-way), matching the pattern in
  // admin/user-search/index.tsx, so navigating back to this page (rather
  // than only via the in-app back link) restores the filter and page.
  const initialSearch = useSearch();
  const [state, setState] = useState<SearchState>(() =>
    parseSearchState(initialSearch),
  );
  const { status, page } = state;

  useEffect(() => {
    navigate(buildSearchUrl(state), { replace: true });
  }, [state, navigate]);

  const { data, isPending, isFetching, isError } = useAdminFeedbackList(
    status,
    (page - 1) * PAGE_SIZE,
    PAGE_SIZE,
  );

  const feedback = data?.feedback ?? [];
  const total = data?.total ?? 0;

  function handleStatusChange(next: FeedbackStatus[]) {
    setState({ status: next, page: 1 });
  }

  function handlePageChange(next: number) {
    setState({ status, page: next });
  }

  return (
    <Stack gap="xl" py="lg" px={{ base: "md", sm: "xl" }}>
      <div>
        <Title order={2}>User feedback</Title>
        <Text c="dimmed" size="sm">
          Everything submitted through the in-app feedback form.
        </Text>
      </div>

      <StatusFilter value={status} onChange={handleStatusChange} />

      <LoadingSwitch
        loading={isPending}
        fallback={
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        }
      >
        {() => {
          if (isError) {
            return (
              <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
                <Text ta="center" c="dimmed">
                  Couldn&rsquo;t load feedback.
                </Text>
              </Paper>
            );
          }

          if (feedback.length === 0) {
            return (
              <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
                <Text ta="center" fw={700}>
                  No feedback matches these statuses
                </Text>
                <Text ta="center" c="dimmed" size="sm" mt={4}>
                  Try selecting a different combination of statuses above.
                </Text>
              </Paper>
            );
          }

          return (
            <>
              <Paper withBorder>
                <Table.ScrollContainer minWidth={780}>
                  <Table highlightOnHover verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th pl="lg">Ref</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Feedback</Table.Th>
                        <Table.Th>Submitted by</Table.Th>
                        <Table.Th>Page</Table.Th>
                        <Table.Th>Date</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {feedback.map((item) => (
                        <Table.Tr
                          key={item.id}
                          onClick={() =>
                            navigate(`/console/feedback/${item.id}`)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <Table.Td pl="lg">
                            <Text size="xs" c="dimmed" ff="monospace">
                              {item.referenceId}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <FeedbackStatusBadge status={item.status} />
                          </Table.Td>
                          <Table.Td maw={340}>
                            <Text size="sm" lineClamp={2} mb={6}>
                              {item.text}
                            </Text>
                            <Group gap={4}>
                              {[
                                ...item.inferredTopic,
                                ...item.inferredSubject,
                              ].map((tag) => (
                                <Badge
                                  key={tag}
                                  size="xs"
                                  color="stone-gray"
                                  variant="light"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" wrap="nowrap">
                              <Avatar
                                radius="xl"
                                size={28}
                                color="bark-brown"
                                variant="light"
                              >
                                {getInitials(item.user.name)}
                              </Avatar>
                              <div style={{ minWidth: 0 }}>
                                <Text size="sm" fw={600} truncate>
                                  {item.user.name}
                                </Text>
                                <Text size="xs" c="dimmed" truncate>
                                  {item.user.email}
                                </Text>
                              </div>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed" ff="monospace">
                              {item.submittedOnPage}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text
                              size="sm"
                              c="dimmed"
                              style={{ whiteSpace: "nowrap" }}
                            >
                              {formatShortDate(item.createdAt)}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Paper>

              <AdminPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={handlePageChange}
                disabled={isFetching}
              />
            </>
          );
        }}
      </LoadingSwitch>
    </Stack>
  );
}
