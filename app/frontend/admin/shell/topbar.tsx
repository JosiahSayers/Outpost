import logoSrc from "$/../assets/images/outpost-logo-no-tagline.svg";
import { authClient } from "$/frontend/utils/auth-client";
import { getInitials } from "$/frontend/utils/get-initials";
import { Avatar, Badge, Group, Image, Stack, Text } from "@mantine/core";
import { Link } from "wouter";

export default function Topbar() {
  const session = authClient.useSession();
  const name = session.data?.user.name ?? "";
  const email = session.data?.user.email ?? "";

  return (
    <Group
      h="100%"
      px={{ base: "md", sm: "xl" }}
      justify="space-between"
      wrap="nowrap"
    >
      <Link href="/console">
        <Group gap={8} wrap="nowrap" style={{ cursor: "pointer" }}>
          <Image src={logoSrc} alt="Outpost" w="auto" height={26} />
          <Badge color="bark-brown" variant="light" size="sm">
            Admin
          </Badge>
        </Group>
      </Link>

      <Group gap="md" wrap="nowrap">
        <Link href="/dashboard">
          <Text size="sm" c="dimmed" style={{ cursor: "pointer" }}>
            ← Back to app
          </Text>
        </Link>
        <Stack gap={0} visibleFrom="sm" style={{ textAlign: "right" }}>
          <Text size="sm" fw={600} truncate>
            {name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {email}
          </Text>
        </Stack>
        <Avatar radius="xl" size={32} color="stone-gray" variant="filled">
          {getInitials(name)}
        </Avatar>
      </Group>
    </Group>
  );
}
