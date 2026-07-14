import SettingsShell from "$/frontend/account/settings-shell";
import PageContainer from "$/frontend/layout/page-container";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { Center, Loader, Text, Title } from "@mantine/core";

export default function AccountPage() {
  const session = useAuthenticatedGuard();

  if (session.isPending) {
    return (
      <Center mih="calc(100vh - 60px)">
        <Loader />
      </Center>
    );
  }

  return (
    <PageContainer gap="xl">
      <div>
        <Title order={1}>Account Settings</Title>
        <Text c="dimmed">Manage the details tied to your account.</Text>
      </div>

      <SettingsShell
        name={session.data?.user.name ?? ""}
        email={session.data?.user.email ?? ""}
      />
    </PageContainer>
  );
}
