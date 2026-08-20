import AdminShell from "$/frontend/admin/shell";
import FeedbackList from "$/frontend/admin/feedback";
import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";
import { Center, Loader } from "@mantine/core";

export default function AdminFeedbackPage() {
  const session = useAdminGuard();

  return (
    <LoadingSwitch
      loading={
        session.isPending ||
        !session.data?.user ||
        session.data.user.role !== "admin"
      }
      fallback={
        <Center mih="100vh">
          <Loader />
        </Center>
      }
    >
      {() => (
        <AdminShell>
          <FeedbackList />
        </AdminShell>
      )}
    </LoadingSwitch>
  );
}
