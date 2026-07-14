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
    <Stack gap="xl" py="xl" px={{ base: "md", md: "xl" }} maw={640} mx="auto">
      <div>
        <Title order={1}>Account Settings</Title>
        <Text c="dimmed">Manage the details tied to your account.</Text>
      </div>

      <Stack gap="md">
        <div>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            Name
          </Text>
          <Text>{session.data?.user.name}</Text>
        </div>
        <div>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            Email
          </Text>
          <Text>{session.data?.user.email}</Text>
        </div>
      </Stack>
    </Stack>
  );
}
