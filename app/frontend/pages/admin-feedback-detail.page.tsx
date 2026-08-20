import AdminShell from "$/frontend/admin/shell";
import FeedbackDetail from "$/frontend/admin/feedback-detail";
import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";
import { Center, Loader } from "@mantine/core";
import { useParams } from "wouter";

export default function AdminFeedbackDetailPage() {
  const session = useAdminGuard();
  const { id } = useParams<{ id: string }>();

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
          <FeedbackDetail feedbackId={id} />
        </AdminShell>
      )}
    </LoadingSwitch>
  );
}
