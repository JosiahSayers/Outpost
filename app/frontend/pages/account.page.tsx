import SettingsShell from "$/frontend/account/settings-shell";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import { Center, Loader, Stack, Text, Title } from "@mantine/core";

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
    <Stack gap="xl" py="xl" px={{ base: "md", md: "xl" }} maw={1000} mx="auto">
      <div>
        <Title order={1}>Account Settings</Title>
        <Text c="dimmed">Manage the details tied to your account.</Text>
      </div>

      <SettingsShell
        name={session.data?.user.name ?? ""}
        email={session.data?.user.email ?? ""}
      />
    </Stack>
  );
}
