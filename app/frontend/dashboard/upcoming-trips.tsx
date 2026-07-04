import AppLink from "$/frontend/app-link";
import TripCard from "$/frontend/dashboard/trip-card";
import { useTrips } from "$/frontend/utils/api/trip";
import {
  Button,
  Card,
  Group,
  Skeleton,
  SimpleGrid,
  Text,
  Title,
} from "@mantine/core";
import { Plus } from "@phosphor-icons/react";

export default function UpcomingTrips() {
  const { data: trips, isFetching } = useTrips();
  const activeTrips = (trips ?? []).filter(
    (t) => t.status !== "finished" && t.status !== "cancelled",
  );

  return (
    <section>
      <Group justify="space-between" mb="md" align="flex-end">
        <div>
          <Title order={2}>Upcoming Trips</Title>
          <Text c="dimmed" size="sm">
            Your planned and upcoming adventures
          </Text>
        </div>
        <Button leftSection={<Plus size={16} />}>New Trip</Button>
      </Group>

      {isFetching ? (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <Card>
            <Skeleton height={16} width="60%" mb="xs" />
            <Skeleton height={12} width="30%" mb="md" />
            <Skeleton height={28} width={90} />
          </Card>
        </SimpleGrid>
      ) : activeTrips.length === 0 ? (
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

      <Group justify="flex-end" mt="sm">
        <AppLink href="/trips">View all trips</AppLink>
      </Group>
    </section>
  );
}
