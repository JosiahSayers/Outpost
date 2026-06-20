import { authClient } from "$/frontend/utils/auth-client";
import { Button, Group, Text } from "@mantine/core";
import { useLocation } from "wouter";

export default function HeaderLinks() {
  const session = authClient.useSession();
  const [, navigate] = useLocation();

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
      <Button variant="subtle" onClick={() => navigate("/sign-in")}>
        Sign In
      </Button>
      <Button variant="subtle" onClick={() => navigate("/register")}>
        Register
      </Button>
    </Group>
  );
}
