import AppLink from "$/frontend/app-link";
import TripCard from "$/frontend/dashboard/trip-card";
import type { Trip } from "$/frontend/dashboard/types";
import { Button, Group, SimpleGrid, Text, Title } from "@mantine/core";
import { Plus } from "@phosphor-icons/react";

interface Props {
  trips: Trip[];
}

export default function UpcomingTrips({ trips }: Props) {
  const activeTrips = trips.filter((t) => t.status !== "completed");

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

      <Group justify="flex-end" mt="sm">
        <AppLink href="/trips">View all trips</AppLink>
      </Group>
    </section>
  );
}
