import BottomNav from "$/frontend/admin/shell/bottom-nav";
import Sidebar from "$/frontend/admin/shell/sidebar";
import Topbar from "$/frontend/admin/shell/topbar";
import {
  AppShell,
  AppShellHeader,
  AppShellMain,
  AppShellNavbar,
} from "@mantine/core";
import type { PropsWithChildren } from "react";

export default function AdminShell({ children }: PropsWithChildren) {
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 212, breakpoint: "sm", collapsed: { mobile: true } }}
      padding={0}
    >
      <AppShellHeader>
        <Topbar />
      </AppShellHeader>

      <AppShellNavbar>
        <Sidebar />
      </AppShellNavbar>

      <AppShellMain pb={{ base: 70, sm: 0 }}>{children}</AppShellMain>

      <BottomNav />
    </AppShell>
  );
}
