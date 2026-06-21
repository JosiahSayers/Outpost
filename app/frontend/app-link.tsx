import { Anchor } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { Link, useRoute } from "wouter";

interface Props extends PropsWithChildren {
  href: string;
}

export default function AppLink({ href, children }: Props) {
  const [isActive] = useRoute(href);

  return (
    <Anchor
      fw={isActive ? "bold" : "normal"}
      underline={isActive ? "always" : "hover"}
      component={Link}
      href={href}
    >
      {children}
    </Anchor>
  );
}
