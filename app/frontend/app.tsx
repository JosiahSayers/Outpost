import "$/frontend/global.css";
import AppProviders from "$/frontend/app-providers";
import AppShell from "$/frontend/layout/app-shell";
import AccountPage from "$/frontend/pages/account.page";
import AdminPage from "$/frontend/pages/admin.page";
import AdminQueuesPage from "$/frontend/pages/admin-queues.page";
import AdminUserSessionsPage from "$/frontend/pages/admin-user-sessions.page";
import AdminUsersPage from "$/frontend/pages/admin-users.page";
import DashboardPage from "$/frontend/pages/dashboard.page";
import ForgotPasswordPage from "$/frontend/pages/forgot-password.page";
import GearInventoryPage from "$/frontend/pages/gear-inventory.page";
import MarketingPage from "$/frontend/pages/marketing.page";
import NotFoundPage from "$/frontend/pages/not-found.page";
import PackingListPage from "$/frontend/pages/packing-list.page";
import RegisterPage from "$/frontend/pages/register.page";
import ResetPasswordPage from "$/frontend/pages/reset-password.page";
import SignInPage from "$/frontend/pages/sign-in.page";
import TripPage from "$/frontend/pages/trip.page";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import { Route, Switch } from "wouter";

export default function App() {
  return (
    <AppProviders>
      <Switch>
        <Route path="/console" component={AdminPage} />
        <Route path="/console/users" component={AdminUsersPage} />
        <Route
          path="/console/users/:id/sessions"
          component={AdminUserSessionsPage}
        />
        <Route path="/console/queues" component={AdminQueuesPage} />
        <Route>
          <AppShell>
            <Switch>
              <Route path="/" component={MarketingPage} />
              <Route path="/account/:tab?" component={AccountPage} />
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/gear-inventory" component={GearInventoryPage} />
              <Route path="/packing-lists/:id" component={PackingListPage} />
              <Route path="/trips/:id" component={TripPage} />
              <Route path="/sign-in" component={SignInPage} />
              <Route path="/register" component={RegisterPage} />
              <Route path="/forgot-password" component={ForgotPasswordPage} />
              <Route path="/reset-password" component={ResetPasswordPage} />
              <Route component={NotFoundPage} />
            </Switch>
          </AppShell>
        </Route>
      </Switch>
    </AppProviders>
  );
}
