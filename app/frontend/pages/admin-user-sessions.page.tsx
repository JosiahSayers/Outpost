import AdminShell from "$/frontend/admin/shell";
import UserSessions from "$/frontend/admin/user-sessions";
import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";
import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
import { Center, Loader } from "@mantine/core";
import { useParams } from "wouter";

export default function AdminUserSessionsPage() {
  const session = useAdminGuard();
  const { id } = useParams<{ id: string }>();
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
      <UserSessions userId={id} />
    </AdminShell>
  );
}
