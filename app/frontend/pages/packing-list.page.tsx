import PackingListView from "$/frontend/packing-list/packing-list-view";
import BackToDashboardLink from "$/frontend/shared-components/back-to-dashboard-link";
import { usePackingList } from "$/frontend/utils/api/packing-list";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { Alert, Center, Loader, Stack } from "@mantine/core";
import { useParams } from "wouter";

export default function PackingListPage() {
  useAuthenticatedGuard();
  const { id } = useParams();
  const { data, isLoading, isError } = usePackingList(Number(id));

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (isError || !data) {
    return (
      <Stack py="xl" px={{ base: "md", md: "xl" }} maw={1100} mx="auto">
        <Alert color="red" title="Couldn't load this packing list">
          The list may not exist or you may not have access to it.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack py="xl" px={{ base: "md", md: "xl" }} maw={1100} mx="auto">
      <BackToDashboardLink />
      <PackingListView list={data} editable={data.editable} />
    </Stack>
  );
}
