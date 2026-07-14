import PageContainer from "$/frontend/layout/page-container";
import BackToDashboardLink from "$/frontend/shared-components/back-to-dashboard-link";
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
      <PageContainer>
        <Alert color="red" title="Couldn't load this trip">
          The trip may not exist or you may not have access to it.
        </Alert>
      </PageContainer>
    );
  }

  const trip = data.trip;

  return (
    <PageContainer gap="xl">
      <Stack gap="md">
        <BackToDashboardLink />
        <Header trip={trip} />
      </Stack>

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
    </PageContainer>
  );
}
