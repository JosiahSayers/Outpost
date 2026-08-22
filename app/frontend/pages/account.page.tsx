import SettingsShell from "$/frontend/account/settings-shell";
import PageContainer from "$/frontend/layout/page-container";
import BackToDashboardLink from "$/frontend/shared-components/back-to-dashboard-link";
import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { Center, Loader, Stack, Text, Title } from "@mantine/core";
import { useParams } from "wouter";

export default function AccountPage() {
  const session = useAuthenticatedGuard();
  const { tab } = useParams<{ tab?: string }>();

  return (
    <LoadingSwitch
      loading={session.isPending}
      fallback={
        <Center mih="calc(100vh - 60px)">
          <Loader />
        </Center>
      }
    >
      {() => (
        <PageContainer gap="xl">
          <Stack gap="md">
            <BackToDashboardLink />
            <div>
              <Title order={1}>Account Settings</Title>
              <Text c="dimmed">Manage the details tied to your account.</Text>
            </div>
          </Stack>

          <SettingsShell
            name={session.data?.user.name ?? ""}
            email={session.data?.user.email ?? ""}
            emailVerified={!!session.data?.user.emailVerified}
            tab={tab}
          />
        </PageContainer>
      )}
    </LoadingSwitch>
  );
}
