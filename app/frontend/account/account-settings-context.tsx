import { authClient } from "$/frontend/utils/auth-client";
import { useAccountSettings } from "$/frontend/utils/api/account-settings";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { createContext, useContext, type PropsWithChildren } from "react";

interface AccountSettingsContextValue {
  settings: ClientUserAccountSetting[] | undefined;
  isPending: boolean;
}

const AccountSettingsContext = createContext<AccountSettingsContextValue>({
  settings: undefined,
  isPending: false,
});

// Mounted once for the whole app (see app.tsx) so every page shares a
// single query/cache for the signed-in user's unit preferences, rather
// than each page fetching independently. Deliberately never blocks
// rendering itself — a page that needs to avoid a flash of the
// locale-guessed unit before the stored one loads (trip, gear inventory)
// folds `isPending` into its own existing loading state instead, the same
// way it already gates on its own data.
export function AccountSettingsProvider({ children }: PropsWithChildren) {
  const session = authClient.useSession();
  return (
    <AccountSettingsProviderBase isAuthenticated={!!session.data?.user}>
      {children}
    </AccountSettingsProviderBase>
  );
}

interface ProviderBaseProps extends PropsWithChildren {
  isAuthenticated: boolean;
}

// Split out from AccountSettingsProvider so it can be tested without
// touching authClient's session hook.
export function AccountSettingsProviderBase({
  isAuthenticated,
  children,
}: ProviderBaseProps) {
  const { data, isPending } = useAccountSettings({
    enabled: isAuthenticated,
  });

  return (
    <AccountSettingsContext.Provider
      value={{ settings: data, isPending: isAuthenticated && isPending }}
    >
      {children}
    </AccountSettingsContext.Provider>
  );
}

export function useAccountSettingsContext() {
  return useContext(AccountSettingsContext);
}
