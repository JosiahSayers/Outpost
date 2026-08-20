import PageContainer from "$/frontend/layout/page-container";
import PackingListView from "$/frontend/packing-list/packing-list-view";
import BackToDashboardLink from "$/frontend/shared-components/back-to-dashboard-link";
import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import { usePackingList } from "$/frontend/utils/api/packing-list";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { Alert } from "@mantine/core";
import { useParams } from "wouter";

export default function PackingListPage() {
  useAuthenticatedGuard();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading: listLoading, isError } = usePackingList(id);

  return (
    <LoadingSwitch loading={listLoading}>
      {() => {
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
      }}
    </LoadingSwitch>
  );
}
