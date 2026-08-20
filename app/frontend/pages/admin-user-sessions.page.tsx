import AdminShell from "$/frontend/admin/shell";
import UserSessions from "$/frontend/admin/user-sessions";
import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";
import { Center, Loader } from "@mantine/core";
import { useParams } from "wouter";

export default function AdminUserSessionsPage() {
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
          <UserSessions userId={id} />
        </AdminShell>
      )}
    </LoadingSwitch>
  );
}
