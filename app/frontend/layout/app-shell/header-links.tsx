import AppLink from "$/frontend/app-link";
import AccountMenu from "$/frontend/layout/app-shell/account-menu";
import { authClient } from "$/frontend/utils/auth-client";
import { Group, Stack } from "@mantine/core";

interface HeaderLinksProps {
  stacked?: boolean;
  onNavigate?: () => void;
}

export default function HeaderLinks({ stacked, onNavigate }: HeaderLinksProps) {
  const session = authClient.useSession();
  const Wrapper = stacked ? Stack : Group;

  if (session.data) {
    return (
      <AccountMenu
        name={session.data.user.name}
        email={session.data.user.email}
        stacked={stacked}
        onNavigate={onNavigate}
        onSignOut={() => authClient.signOut()}
      />
    );
  }

  return (
    <Wrapper onClick={onNavigate}>
      <AppLink href="/sign-in">Sign In</AppLink>
      <AppLink href="/register">Register</AppLink>
    </Wrapper>
  );
}
