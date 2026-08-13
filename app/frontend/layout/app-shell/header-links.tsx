import AppLink from "$/frontend/app-link";
import AccountMenu from "$/frontend/layout/app-shell/account-menu";
import { authClient } from "$/frontend/utils/auth-client";
import { useSignOutContext } from "$/frontend/utils/sign-out-context";
import { Anchor, Group, Stack } from "@mantine/core";
import { useLayoutEffect } from "react";
import { useLocation, useRoute } from "wouter";

interface HeaderLinksProps {
  stacked?: boolean;
  onNavigate?: () => void;
  onOpenFeedback: () => void;
}

export default function HeaderLinks({
  stacked,
  onNavigate,
  onOpenFeedback,
}: HeaderLinksProps) {
  const session = authClient.useSession();
  const [, navigate] = useLocation();
  const { markSignOutInitiated, clearSignOutInitiated, isSignOutInitiated } =
    useSignOutContext();
  const Wrapper = stacked ? Stack : Group;

  // Navigate only once the session store actually reflects the signed-out
  // state, not just once the sign-out request resolves — better-auth's
  // client cache lags the request by a signal bump, so navigating
  // immediately would land on /sign-in while it still looks authenticated
  // and get bounced straight back by useUnauthenticatedGuard there.
  //
  // Deliberately does not clear the sign-out flag itself: better-auth's
  // session store is an external store, and its change notifications aren't
  // guaranteed to land in the same React commit as the authenticated-route
  // guard on whatever page we're signing out from. Clearing here raced that
  // guard's own read of the flag. Instead, SignInPage clears it once it
  // actually mounts with `reason=signed-out` — by then the old page (and its
  // guard) is gone, so there's nothing left to race.
  useLayoutEffect(() => {
    if (isSignOutInitiated() && !session.isPending && !session.data?.user) {
      navigate("/sign-in?reason=signed-out");
    }
  }, [session.data, session.isPending]);

  const handleSignOut = () => {
    markSignOutInitiated();
    authClient.signOut({
      fetchOptions: {
        // The sign-out never completed, so leave the authenticated-route
        // guard doing its normal thing again instead of leaving it silently
        // disabled on this page.
        onError: () => {
          clearSignOutInitiated();
        },
      },
    });
  };

  if (session.data) {
    return (
      <AccountMenu
        name={session.data.user.name}
        email={session.data.user.email}
        isAdmin={session.data.user.role === "admin"}
        stacked={stacked}
        onNavigate={onNavigate}
        onOpenFeedback={onOpenFeedback}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <Wrapper onClick={onNavigate}>
      <HeaderLink href="/sign-in">Sign In</HeaderLink>
      <HeaderLink href="/register">Register</HeaderLink>
    </Wrapper>
  );
}

function HeaderLink({ href, children }: { href: string; children: string }) {
  const [isActive] = useRoute(href);

  return (
    <Anchor
      component={AppLink}
      href={href}
      fw={isActive ? "bold" : "normal"}
      underline={isActive ? "always" : "hover"}
    >
      {children}
    </Anchor>
  );
}
