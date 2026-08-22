import AdminPagination from "$/frontend/admin/shared/pagination";
import BackToDashboardLink from "$/frontend/shared-components/back-to-dashboard-link";
import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import NotificationRow from "$/frontend/layout/app-shell/notification-row";
import PageContainer from "$/frontend/layout/page-container";
import {
  notificationKeys,
  useDismissNotification,
  useMarkNotificationsRead,
  useNotificationList,
} from "$/frontend/utils/api/notifications";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { useDismissAnimation } from "$/frontend/utils/hooks/use-dismiss-animation";
import {
  Alert,
  Center,
  Loader,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";

const PAGE_SIZE = 20;

type Tab = "unread" | "history";

export default function NotificationsPage() {
  useAuthenticatedGuard();
  const [tab, setTab] = useState<Tab>("unread");
  const [page, setPage] = useState(1);

  const params = {
    dismissed: tab === "history",
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  };
  const queryKey = notificationKeys.list(params);
  const { data, isLoading, isError } = useNotificationList(params);
  const dismiss = useDismissNotification(queryKey);
  const markRead = useMarkNotificationsRead();
  const { dismissingIds, beginDismiss } = useDismissAnimation((id) =>
    dismiss.mutate(id),
  );

  const handleOpen = (notificationId: string, read: boolean) => {
    if (!read) {
      markRead.mutate([notificationId]);
    }
  };

  const handleTabChange = (value: string) => {
    setTab(value as Tab);
    setPage(1);
  };

  return (
    <PageContainer gap="lg">
      <Stack gap="md">
        <BackToDashboardLink />
        <Title order={2}>Notifications</Title>
      </Stack>

      <SegmentedControl
        value={tab}
        onChange={handleTabChange}
        maw={260}
        data={[
          { label: "Unread", value: "unread" },
          { label: "History", value: "history" },
        ]}
      />

      <LoadingSwitch
        loading={isLoading}
        fallback={
          <Center py="xl">
            <Loader />
          </Center>
        }
      >
        {() => {
          if (isError) {
            return (
              <Alert color="red" title="Couldn't load notifications">
                Something went wrong. Please try refreshing the page.
              </Alert>
            );
          }

          if (data?.notifications.length === 0) {
            return (
              <Text c="dimmed" py="xl" ta="center">
                {tab === "unread"
                  ? "You're all caught up."
                  : "Dismissed notifications will show up here."}
              </Text>
            );
          }

          return (
            <Stack gap={4}>
              {data?.notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  dismissing={dismissingIds.has(notification.id)}
                  dismissible={tab !== "history"}
                  onOpen={() => handleOpen(notification.id, notification.read)}
                  onDismiss={() => beginDismiss(notification.id)}
                />
              ))}
            </Stack>
          );
        }}
      </LoadingSwitch>

      {data && (
        <AdminPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </PageContainer>
  );
}
