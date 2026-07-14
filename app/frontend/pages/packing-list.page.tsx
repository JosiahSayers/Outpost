import PageContainer from "$/frontend/layout/page-container";
import PackingListView from "$/frontend/packing-list/packing-list-view";
import BackToDashboardLink from "$/frontend/shared-components/back-to-dashboard-link";
import { usePackingList } from "$/frontend/utils/api/packing-list";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { Alert, Center, Loader } from "@mantine/core";
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
      <PageContainer>
        <Alert color="red" title="Couldn't load this packing list">
          The list may not exist or you may not have access to it.
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackToDashboardLink />
      <PackingListView list={data} editable={data.editable} />
    </PageContainer>
  );
}
