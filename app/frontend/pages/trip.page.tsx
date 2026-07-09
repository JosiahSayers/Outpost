import Header from "$/frontend/trip/header";
import Links from "$/frontend/trip/links";
import MealPlanSection from "$/frontend/trip/meal-plan";
import PackingListSection from "$/frontend/trip/packing-lists";
import Tasks from "$/frontend/trip/tasks";
import { useTrip } from "$/frontend/utils/api/trip";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { Alert, Center, Divider, Loader, Stack } from "@mantine/core";
import { useParams } from "wouter";

export default function TripPage() {
  useAuthenticatedGuard();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useTrip(id);

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (isError || !data) {
    return (
      <Stack py="xl" px={{ base: "md", md: "xl" }} maw={1000} mx="auto">
        <Alert color="red" title="Couldn't load this trip">
          The trip may not exist or you may not have access to it.
        </Alert>
      </Stack>
    );
  }

  const trip = data.trip;

  return (
    <Stack gap="xl" maw={1000} mx="auto" px={{ base: "md", md: "xl" }} py="xl">
      <Header trip={trip} />

      <Tasks
        tripId={trip.id}
        tasks={trip.tasks}
        tripStart={trip.start}
        tripEnd={trip.end}
      />

      <Divider />

      <MealPlanSection
        tripId={trip.id}
        mealPlan={trip.mealPlan}
        tripStart={trip.start}
      />

      <Divider />

      <PackingListSection />

      <Divider />

      <Links />
    </Stack>
  );
}
