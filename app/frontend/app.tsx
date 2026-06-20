import AppShell from "$/frontend/layout/app-shell";
import { trailTheme } from "$/frontend/theme";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Switch, Route } from "wouter";
import "@mantine/core/styles.css";
import SignInPage from "$/frontend/pages/sign-in.page";
import RegisterPage from "$/frontend/pages/register.page";

export default function App() {
  return (
    <>
      <ColorSchemeScript />
      <MantineProvider theme={trailTheme}>
        <AppShell>
          <Switch>
            <Route path="/sign-in" component={SignInPage} />
            <Route path="/register" component={RegisterPage} />
          </Switch>
        </AppShell>
      </MantineProvider>
    </>
  );
}
