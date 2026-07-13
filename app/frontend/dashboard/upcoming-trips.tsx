import NewTripDrawer from "$/frontend/dashboard/new-trip-drawer";
import TripCard from "$/frontend/dashboard/trip-card";
import { useTripsPage } from "$/frontend/utils/api/trip";
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

const PREVIEW_SIZE = 3;
const PAGE_SIZE = 6;

export default function UpcomingTrips() {
  const [showAll, { toggle: toggleShowAll }] = useDisclosure(false);
  const [page, setPage] = useState(1);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  // One query backs both views: collapsed fetches the top few trips of any
  // status; expanded pages through the full list. Because `trips` and `total`
  // always come from the same response, the preview and the expanded list can
  // never disagree.
  const skip = showAll ? (page - 1) * PAGE_SIZE : 0;
  const { data, isFetching } = useTripsPage(skip, PAGE_SIZE);
  const trips = data?.trips ?? [];
  const total = data?.total ?? 0;

  const hasMoreToShow = total > PREVIEW_SIZE;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  function handleToggle() {
    setPage(1);
    toggleShowAll();
  }

  return (
    <section>
      <Group justify="space-between" mb="md" align="flex-end">
        <div>
          <Title order={2}>My Trips</Title>
          <Text c="dimmed" size="sm">
            Your upcoming and recent adventures
          </Text>
        </div>
        <Button leftSection={<PlusIcon size={16} />} onClick={openDrawer}>
          New Trip
        </Button>
      </Group>

      <NewTripDrawer opened={drawerOpened} onClose={closeDrawer} />

      {isFetching ? (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {Array.from({ length: showAll ? 6 : 3 }).map((_, i) => (
            <Card key={i}>
              <Skeleton height={24} width="60%" mb="xs" />
              <Skeleton height={24} width="30%" mb="md" />
              <Skeleton height={28} width={90} />
            </Card>
          ))}
        </SimpleGrid>
      ) : total === 0 ? (
        <Text c="dimmed">
          No upcoming trips. Start planning your next adventure!
        </Text>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {trips.slice(0, PREVIEW_SIZE).map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </SimpleGrid>

          <Collapse expanded={showAll}>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mt="md">
              {trips.slice(PREVIEW_SIZE).map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </SimpleGrid>

            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination
                  total={totalPages}
                  value={page}
                  onChange={setPage}
                  disabled={isFetching}
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
