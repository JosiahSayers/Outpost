import AppLogo from "$/frontend/layout/app-shell/app-logo";
import HeaderLinks from "$/frontend/layout/app-shell/header-links";
import MarmotAvatar from "$/frontend/layout/app-shell/marmot-avatar";
import { authClient } from "$/frontend/utils/auth-client";
import {
  AppShellHeader,
  Burger,
  Drawer,
  Group,
  Stack,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "wouter";

export default function Header() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const session = authClient.useSession();
  const logoHref = session.data ? "/dashboard" : "/";

  return (
    <>
      <AppShellHeader>
        <Group
          px={{ base: "md", sm: "xl" }}
          justify="space-between"
          align="center"
          h="100%"
        >
          <Link href={logoHref}>
            <AppLogo height={50} style={{ cursor: "pointer" }} />
          </Link>
          <Group visibleFrom="sm">
            <HeaderLinks />
          </Group>
          {session.data ? (
            <UnstyledButton
              onClick={toggle}
              hiddenFrom="sm"
              aria-label="Toggle menu"
              style={{ borderRadius: "50%", cursor: "pointer" }}
            >
              <MarmotAvatar size={36} winking={opened} />
            </UnstyledButton>
          ) : (
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle menu"
            />
          )}
        </Group>
      </AppShellHeader>
      <Drawer opened={opened} onClose={close} title="Menu" size="xs">
        <Stack>
          <HeaderLinks stacked onNavigate={close} />
        </Stack>
      </Drawer>
    </>
  );
}
