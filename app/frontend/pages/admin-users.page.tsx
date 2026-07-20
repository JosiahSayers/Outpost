import AdminShell from "$/frontend/admin/shell";
import UserSearch from "$/frontend/admin/user-search";
import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";
import { Center, Loader } from "@mantine/core";

export default function AdminUsersPage() {
  const session = useAdminGuard();

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
      <UserSearch />
    </AdminShell>
  );
}
