import AdminOverview from "$/frontend/admin/overview";
import AdminShell from "$/frontend/admin/shell";
import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";
import { Center, Loader } from "@mantine/core";

export default function AdminPage() {
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
      {() => {
        if (!session.data?.user) return null;

        return (
          <AdminShell>
            <AdminOverview adminName={session.data.user.name} />
          </AdminShell>
        );
      }}
    </LoadingSwitch>
  );
}
