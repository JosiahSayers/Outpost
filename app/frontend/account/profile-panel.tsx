import { Stack, Text, Title } from "@mantine/core";

interface ProfilePanelProps {
  name: string;
  email: string;
}

export default function ProfilePanel({ name, email }: ProfilePanelProps) {
  return (
    <Stack gap="md">
      <Title order={3}>Profile</Title>
      <Stack gap="md">
        <div>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            Name
          </Text>
          <Text>{name}</Text>
        </div>
        <div>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            Email
          </Text>
          <Text>{email}</Text>
        </div>
      </Stack>
    </Stack>
  );
}
