import logoSrc from "$/../assets/images/outpost-logo-no-tagline.svg";
import HeaderLinks from "$/frontend/layout/app-shell/header-links";
import { authClient } from "$/frontend/utils/auth-client";
import {
  AppShellHeader,
  Burger,
  Drawer,
  Group,
  Image,
  Stack,
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
            <Image
              src={logoSrc}
              alt="Outpost"
              w="auto"
              height={50}
              style={{ cursor: "pointer" }}
            />
          </Link>
          <Group visibleFrom="sm">
            <HeaderLinks />
          </Group>
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="sm"
            size="sm"
            aria-label="Toggle menu"
          />
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
