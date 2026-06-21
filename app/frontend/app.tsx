import AppShell from "$/frontend/layout/app-shell";
import DashboardPage from "$/frontend/pages/dashboard.page";
import MarketingPage from "$/frontend/pages/marketing.page";
import NotFoundPage from "$/frontend/pages/not-found.page";
import RegisterPage from "$/frontend/pages/register.page";
import SignInPage from "$/frontend/pages/sign-in.page";
import { trailTheme } from "$/frontend/theme";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { Route, Switch } from "wouter";

export default function App() {
  return (
    <>
      <ColorSchemeScript />
      <MantineProvider theme={trailTheme}>
        <AppShell>
          <Switch>
            <Route path="/" component={MarketingPage} />
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/sign-in" component={SignInPage} />
            <Route path="/register" component={RegisterPage} />
            <Route component={NotFoundPage} />
          </Switch>
        </AppShell>
      </MantineProvider>
    </>
  );
}
