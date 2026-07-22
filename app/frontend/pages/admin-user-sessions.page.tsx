import AdminShell from "$/frontend/admin/shell";
import UserSessions from "$/frontend/admin/user-sessions";
import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";
import { Center, Loader } from "@mantine/core";
import { useParams } from "wouter";

export default function AdminUserSessionsPage() {
  const session = useAdminGuard();
  const { id } = useParams<{ id: string }>();

  if (
    session.isPending ||
    !session.data?.user ||
    session.data.user.role !== "admin"
  ) {
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    );
  }

  return (
    <AdminShell>
      <UserSessions userId={id} />
    </AdminShell>
  );
}
