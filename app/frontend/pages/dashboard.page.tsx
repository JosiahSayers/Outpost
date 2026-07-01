import GearSummaryBar from "$/frontend/dashboard/gear-summary";
import PackingLists from "$/frontend/dashboard/packing-lists";
import type { Trip } from "$/frontend/dashboard/types";
import UpcomingTrips from "$/frontend/dashboard/upcoming-trips";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { Center, Loader, Stack, Text, Title } from "@mantine/core";

// ── Placeholder data ──────────────────────────────────────────────────────────
// Replace these with real API calls once the Trip backend is in place.

const DUMMY_TRIPS: Trip[] = [
  {
    id: "1",
    name: "JMT: Tuolumne Meadows to Whitney Portal",
    location: "Sierra Nevada, CA",
    startDate: "2026-07-15",
    endDate: "2026-07-28",
    status: "upcoming",
    packingLists: [
      { id: 1, name: "Main Pack", itemCount: 32, status: "complete" },
      {
        id: 2,
        name: "Food & Resupply",
        itemCount: 18,
        status: "in-progress",
      },
    ],
  },
  {
    id: "2",
    name: "Desolation Wilderness Weekend",
    location: "Lake Tahoe, CA",
    startDate: "2026-08-10",
    endDate: "2026-08-12",
    status: "planning",
    packingLists: [
      { id: 3, name: "Weekend Kit", itemCount: 24, status: "not-started" },
    ],
  },
  {
    id: "3",
    name: "Olympic Peninsula Loop",
    location: "Olympic National Park, WA",
    startDate: "2026-09-05",
    endDate: "2026-09-10",
    status: "planning",
    packingLists: [
      {
        id: 4,
        name: "Rain Gear Kit",
        itemCount: 28,
        status: "not-started",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────

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

      <UpcomingTrips trips={DUMMY_TRIPS} />

      <PackingLists />

      <GearSummaryBar />
    </Stack>
  );
}
