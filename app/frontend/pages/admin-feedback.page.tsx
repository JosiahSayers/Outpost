import AdminShell from "$/frontend/admin/shell";
import FeedbackList from "$/frontend/admin/feedback";
import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";
import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
import { Center, Loader } from "@mantine/core";

export default function AdminFeedbackPage() {
  const session = useAdminGuard();
  const { isLoading, showSpinner } = useDelayedLoading(
    session.isPending ||
      !session.data?.user ||
      session.data.user.role !== "admin",
  );

  if (isLoading) {
    return showSpinner ? (
      <Center mih="100vh">
        <Loader />
      </Center>
    ) : null;
  }

  return (
    <AdminShell>
      <FeedbackList />
    </AdminShell>
  );
}
