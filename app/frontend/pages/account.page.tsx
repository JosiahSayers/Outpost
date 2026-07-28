import SettingsShell from "$/frontend/account/settings-shell";
import PageContainer from "$/frontend/layout/page-container";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
import { Center, Loader, Text, Title } from "@mantine/core";
import { useParams } from "wouter";

export default function AccountPage() {
  const session = useAuthenticatedGuard();
  const { tab } = useParams<{ tab?: string }>();
  const { isLoading, showSpinner } = useDelayedLoading(session.isPending);

  if (isLoading) {
    return showSpinner ? (
      <Center mih="calc(100vh - 60px)">
        <Loader />
      </Center>
    ) : null;
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
        tab={tab}
      />
    </PageContainer>
  );
}
