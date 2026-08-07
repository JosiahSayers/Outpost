import AdminPagination from "$/frontend/admin/shared/pagination";
import { formatShortDate } from "$/frontend/admin/feedback/format-date";
import FeedbackStatusBadge from "$/frontend/admin/feedback/status-badge";
import { ACTIONABLE_STATUSES } from "$/frontend/admin/feedback/status";
import StatusFilter from "$/frontend/admin/feedback/status-filter";
import { useAdminFeedbackList } from "$/frontend/utils/api/admin-feedback";
import { getInitials } from "$/frontend/utils/get-initials";
import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
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
import { useState } from "react";
import { useLocation } from "wouter";
import type { FeedbackStatus } from "../../../../generated/prisma/enums";

const PAGE_SIZE = 10;

export default function FeedbackList() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<FeedbackStatus[]>(ACTIONABLE_STATUSES);
  const [page, setPage] = useState(1);

  const { data, isPending, isFetching, isError } = useAdminFeedbackList(
    status,
    (page - 1) * PAGE_SIZE,
    PAGE_SIZE,
  );
  const { isLoading, showSpinner } = useDelayedLoading(isPending);

  const feedback = data?.feedback ?? [];
  const total = data?.total ?? 0;

  function handleStatusChange(next: FeedbackStatus[]) {
    setStatus(next);
    setPage(1);
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

      {isLoading &&
        (showSpinner ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : null)}

      {!isLoading && isError && (
        <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
          <Text ta="center" c="dimmed">
            Couldn&rsquo;t load feedback.
          </Text>
        </Paper>
      )}

      {!isLoading && !isError && feedback.length === 0 && (
        <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
          <Text ta="center" fw={700}>
            No feedback matches these statuses
          </Text>
          <Text ta="center" c="dimmed" size="sm" mt={4}>
            Try selecting a different combination of statuses above.
          </Text>
        </Paper>
      )}

      {!isLoading && !isError && feedback.length > 0 && (
        <Paper withBorder>
          <Table.ScrollContainer minWidth={780}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th pl="lg">Status</Table.Th>
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
                    onClick={() => navigate(`/console/feedback/${item.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <Table.Td pl="lg">
                      <FeedbackStatusBadge status={item.status} />
                    </Table.Td>
                    <Table.Td maw={340}>
                      <Text size="sm" lineClamp={2} mb={6}>
                        {item.text}
                      </Text>
                      <Group gap={4}>
                        {[...item.inferredTopic, ...item.inferredSubject].map(
                          (tag) => (
                            <Badge
                              key={tag}
                              size="xs"
                              color="stone-gray"
                              variant="light"
                            >
                              {tag}
                            </Badge>
                          ),
                        )}
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
      )}

      {!isLoading && !isError && feedback.length > 0 && (
        <AdminPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          disabled={isFetching}
        />
      )}
    </Stack>
  );
}
