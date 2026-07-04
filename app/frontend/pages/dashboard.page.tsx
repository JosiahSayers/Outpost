import GearSummaryBar from "$/frontend/dashboard/gear-summary";
import PackingLists from "$/frontend/dashboard/packing-lists";
import UpcomingTrips from "$/frontend/dashboard/upcoming-trips";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { Center, Loader, Stack, Text, Title } from "@mantine/core";

export default function DashboardPage() {
  const session = useAuthenticatedGuard();

  if (session.isPending) {
    return (
      <Center mih="calc(100vh - 60px)">
        <Loader />
      </Center>
    );
  }

  const firstName = (session.data?.user.name ?? "").split(" ")[0];

  return (
    <Stack gap="xl" py="xl" px={{ base: "md", md: "xl" }} maw={1200} mx="auto">
      <div>
        <Title order={1}>
          Welcome back{firstName ? `, ${firstName}!` : "!"}
        </Title>
        <Text c="dimmed">Here&apos;s what&apos;s coming up on the trail.</Text>
      </div>

      <UpcomingTrips />

      <PackingLists />

      <GearSummaryBar />
    </Stack>
  );
}
