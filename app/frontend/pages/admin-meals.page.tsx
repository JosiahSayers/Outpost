import AdminShell from "$/frontend/admin/shell";
import AdminMeals from "$/frontend/admin/meals";
import { useAdminGuard } from "$/frontend/utils/guards/admin.guard";
import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
import { Center, Loader } from "@mantine/core";

export default function AdminMealsPage() {
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
      <AdminMeals />
    </AdminShell>
  );
}
