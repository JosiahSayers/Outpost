import GearSummaryBar from "$/frontend/dashboard/gear-summary";
import PackingLists from "$/frontend/dashboard/packing-lists";
import UpcomingTrips from "$/frontend/dashboard/upcoming-trips";
import PageContainer from "$/frontend/layout/page-container";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { Center, Loader, Text, Title } from "@mantine/core";

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
    <PageContainer gap="xl">
      <div>
        <Title order={1}>
          Welcome back{firstName ? `, ${firstName}!` : "!"}
        </Title>
        <Text c="dimmed">Here&apos;s what&apos;s coming up on the trail.</Text>
      </div>

      <UpcomingTrips />

      <PackingLists />

      <GearSummaryBar />
    </PageContainer>
  );
}
