import Header from "$/frontend/layout/app-shell/header";
import { AppShellMain, AppShell as MantineShell } from "@mantine/core";
import type { PropsWithChildren } from "react";

export default function AppShell({ children }: PropsWithChildren) {
  return (
    <MantineShell padding="md" header={{ height: 60 }}>
      <Header />

      <AppShellMain>{children}</AppShellMain>
    </MantineShell>
  );
}
