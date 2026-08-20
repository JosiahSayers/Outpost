import AdminShell from "$/frontend/admin/shell";
import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";
import { Box, Center, Loader } from "@mantine/core";

export default function AdminQueuesPage() {
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
          <Box
            style={{
              height: "calc(100dvh - var(--app-shell-header-height, 60px))",
            }}
            pb={{ base: 70, sm: 0 }}
          >
            <iframe
              src="/admin/queues"
              title="Queues"
              style={{
                width: "100%",
                height: "100%",
                border: 0,
                display: "block",
              }}
            />
          </Box>
        </AdminShell>
      )}
    </LoadingSwitch>
  );
}
