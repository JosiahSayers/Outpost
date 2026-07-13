import NewTripDrawer from "$/frontend/dashboard/new-trip-drawer";
import TripCard from "$/frontend/dashboard/trip-card";
import { useTrips, useTripsPage } from "$/frontend/utils/api/trip";
import {
  Button,
  Card,
  Collapse,
  Group,
  Pagination,
  SimpleGrid,
  Skeleton,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";

const EXPANDED_PAGE_SIZE = 6;

export default function UpcomingTrips() {
  const { data, isFetching } = useTrips();
  const trips = data?.trips ?? [];
  const total = data?.total ?? 0;
  const activeTrips = trips.filter(
    (t) => t.status !== "finished" && t.status !== "cancelled",
  );

  const [showAll, { toggle: toggleShowAll }] = useDisclosure(false);
  const [page, setPage] = useState(1);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  // Anything not already visible in the preview above - whether more active
  // trips beyond the first page, or finished/cancelled trips excluded from
  // it - is reachable by expanding "View all trips".
  const hasMoreToShow = total > activeTrips.length;
  const totalPages = Math.max(Math.ceil(total / EXPANDED_PAGE_SIZE), 1);

  const { data: pageData, isFetching: isFetchingPage } = useTripsPage(
    (page - 1) * EXPANDED_PAGE_SIZE,
    EXPANDED_PAGE_SIZE,
    showAll,
  );

  function handleToggle() {
    setPage(1);
    toggleShowAll();
  }

  return (
    <section>
      <Group justify="space-between" mb="md" align="flex-end">
        <div>
          <Title order={2}>Upcoming Trips</Title>
          <Text c="dimmed" size="sm">
            Your planned and upcoming adventures
          </Text>
        </div>
        <Button leftSection={<PlusIcon size={16} />} onClick={openDrawer}>
          New Trip
        </Button>
      </Group>

      <NewTripDrawer opened={drawerOpened} onClose={closeDrawer} />

      {isFetching ? (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <Card>
            <Skeleton height={16} width="60%" mb="xs" />
            <Skeleton height={12} width="30%" mb="md" />
            <Skeleton height={28} width={90} />
          </Card>
        </SimpleGrid>
      ) : total === 0 ? (
        <Text c="dimmed">
          No upcoming trips. Start planning your next adventure!
        </Text>
      ) : (
        <>
          <Collapse expanded={!showAll} keepMounted={false}>
            {activeTrips.length === 0 ? (
              <Text c="dimmed">
                No upcoming trips. Start planning your next adventure!
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {activeTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </SimpleGrid>
            )}
          </Collapse>

          <Collapse expanded={showAll} keepMounted={false}>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {(pageData?.trips ?? []).map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </SimpleGrid>

            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination
                  total={totalPages}
                  value={page}
                  onChange={setPage}
                  disabled={isFetchingPage}
                />
              </Group>
            )}
          </Collapse>

          {hasMoreToShow && (
            <Group justify="flex-end" mt="sm">
              <Button variant="subtle" onClick={handleToggle}>
                {showAll ? "View less" : "View all trips"}
              </Button>
            </Group>
          )}
        </>
      )}
    </section>
  );
}
