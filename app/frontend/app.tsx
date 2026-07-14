import "$/frontend/global.css";
import AppShell from "$/frontend/layout/app-shell";
import AccountPage from "$/frontend/pages/account.page";
import DashboardPage from "$/frontend/pages/dashboard.page";
import GearInventoryPage from "$/frontend/pages/gear-inventory.page";
import MarketingPage from "$/frontend/pages/marketing.page";
import NotFoundPage from "$/frontend/pages/not-found.page";
import PackingListPage from "$/frontend/pages/packing-list.page";
import RegisterPage from "$/frontend/pages/register.page";
import SignInPage from "$/frontend/pages/sign-in.page";
import TripPage from "$/frontend/pages/trip.page";
import { trailTheme } from "$/frontend/theme";
import { queryClient } from "$/frontend/utils/api/query-client";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";

export default function App() {
  return (
    <>
      <ColorSchemeScript />
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={trailTheme}>
          <Notifications />
          <AppShell>
            <Switch>
              <Route path="/" component={MarketingPage} />
              <Route path="/account" component={AccountPage} />
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/gear-inventory" component={GearInventoryPage} />
              <Route path="/packing-lists/:id" component={PackingListPage} />
              <Route path="/trips/:id" component={TripPage} />
              <Route path="/sign-in" component={SignInPage} />
              <Route path="/register" component={RegisterPage} />
              <Route component={NotFoundPage} />
            </Switch>
          </AppShell>
        </MantineProvider>
      </QueryClientProvider>
    </>
  );
}
