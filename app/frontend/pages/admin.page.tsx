import AdminOverview from "$/frontend/admin/overview";
import AdminShell from "$/frontend/admin/shell";
import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";
import { Center, Loader } from "@mantine/core";

export default function AdminPage() {
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
      <AdminOverview adminName={session.data.user.name} />
    </AdminShell>
  );
}
