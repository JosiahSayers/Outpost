import AdminOverview from "$/frontend/admin/overview";
import AdminShell from "$/frontend/admin/shell";
import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";
import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
import { Center, Loader } from "@mantine/core";

export default function AdminPage() {
  const session = useAdminGuard();
  const { isLoading, showSpinner } = useDelayedLoading(
    session.isPending ||
      !session.data?.user ||
      session.data.user.role !== "admin",
  );

  if (isLoading || !session.data?.user) {
    return showSpinner ? (
      <Center mih="100vh">
        <Loader />
      </Center>
    ) : null;
  }

  return (
    <AdminShell>
      <AdminOverview adminName={session.data.user.name} />
    </AdminShell>
  );
}
