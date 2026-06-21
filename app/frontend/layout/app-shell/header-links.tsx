import AppLink from "$/frontend/app-link";
import { authClient } from "$/frontend/utils/auth-client";
import { Button, Group, Stack, Text } from "@mantine/core";

interface HeaderLinksProps {
  stacked?: boolean;
  onNavigate?: () => void;
}

export default function HeaderLinks({ stacked, onNavigate }: HeaderLinksProps) {
  const session = authClient.useSession();
  const Wrapper = stacked ? Stack : Group;

  if (session.data !== null) {
    return (
      <Wrapper>
        <Text>Hello {session.data.user.name}</Text>
        <Button
          variant="subtle"
          onClick={() => {
            authClient.signOut();
            onNavigate?.();
          }}
        >
          Sign Out
        </Button>
      </Wrapper>
    );
  }

  return (
    <Wrapper onClick={onNavigate}>
      <AppLink href="/sign-in">Sign In</AppLink>
      <AppLink href="/register">Register</AppLink>
    </Wrapper>
  );
}
