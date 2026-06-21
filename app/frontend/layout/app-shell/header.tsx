import logoSrc from "$/../assets/images/outpost-logo-no-tagline.svg";
import HeaderLinks from "$/frontend/layout/app-shell/header-links";
import { AppShellHeader, Group, Image } from "@mantine/core";
import { Link } from "wouter";

export default function Header() {
  return (
    <AppShellHeader>
      <Group px="xl" justify="space-between" align="center">
        <Link href="/">
          <Image
            src={logoSrc}
            alt="Outpost"
            w="auto"
            height={50}
            style={{ cursor: "pointer" }}
          />
        </Link>
        <HeaderLinks />
      </Group>
    </AppShellHeader>
  );
}
