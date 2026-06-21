import AppLink from "$/frontend/app-link";
import { authClient } from "$/frontend/utils/auth-client";
import { Button, Group, Text } from "@mantine/core";

export default function HeaderLinks() {
  const session = authClient.useSession();

  if (session.data !== null) {
    return (
      <Group>
        <Text>Hello {session.data.user.name}</Text>
        <Button variant="subtle" onClick={() => authClient.signOut()}>
          Sign Out
        </Button>
      </Group>
    );
  }

  return (
    <Group>
      <AppLink href="/sign-in">Sign In</AppLink>
      <AppLink href="/register">Register</AppLink>
    </Group>
  );
}
