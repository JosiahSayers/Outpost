import "$/frontend/global.css";
import AppProviders from "$/frontend/app-providers";
import AppShell from "$/frontend/layout/app-shell";
import AccountPage from "$/frontend/pages/account.page";
import AdminPage from "$/frontend/pages/admin.page";
import AdminFeaturesPage from "$/frontend/pages/admin-features.page";
import AdminFeedbackDetailPage from "$/frontend/pages/admin-feedback-detail.page";
import AdminFeedbackPage from "$/frontend/pages/admin-feedback.page";
import AdminMealsPage from "$/frontend/pages/admin-meals.page";
import AdminQueuesPage from "$/frontend/pages/admin-queues.page";
import AdminUserSessionsPage from "$/frontend/pages/admin-user-sessions.page";
import AdminUsersPage from "$/frontend/pages/admin-users.page";
import DashboardPage from "$/frontend/pages/dashboard.page";
import ForgotPasswordPage from "$/frontend/pages/forgot-password.page";
import GearInventoryPage from "$/frontend/pages/gear-inventory.page";
import MarketingPage from "$/frontend/pages/marketing.page";
import NotFoundPage from "$/frontend/pages/not-found.page";
import NotificationsPage from "$/frontend/pages/notifications.page";
import PackingListPage from "$/frontend/pages/packing-list.page";
import RegisterPage from "$/frontend/pages/register.page";
import ResetPasswordPage from "$/frontend/pages/reset-password.page";
import SignInPage from "$/frontend/pages/sign-in.page";
import TripPage from "$/frontend/pages/trip.page";
import TwoFactorPage from "$/frontend/pages/two-factor.page";
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
        <Route path="/console/meals" component={AdminMealsPage} />
        <Route path="/console/queues" component={AdminQueuesPage} />
        <Route path="/console/feedback" component={AdminFeedbackPage} />
        <Route
          path="/console/feedback/:id"
          component={AdminFeedbackDetailPage}
        />
        <Route path="/console/feature-flags" component={AdminFeaturesPage} />
        <Route>
          <AppShell>
            <Switch>
              <Route path="/" component={MarketingPage} />
              <Route path="/account/:tab?" component={AccountPage} />
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/gear-inventory" component={GearInventoryPage} />
              <Route path="/notifications" component={NotificationsPage} />
              <Route path="/packing-lists/:id" component={PackingListPage} />
              <Route path="/trips/:id" component={TripPage} />
              <Route path="/sign-in" component={SignInPage} />
              <Route path="/two-factor" component={TwoFactorPage} />
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
