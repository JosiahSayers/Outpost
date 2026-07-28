import { authClient } from "$/frontend/utils/auth-client";
import { useSignOutContext } from "$/frontend/utils/sign-out-context";
import { useLayoutEffect } from "react";
import { useLocation } from "wouter";

export function useAuthenticatedGuard() {
  const session = authClient.useSession();
  const [location, navigate] = useLocation();
  const { isSignOutInitiated } = useSignOutContext();

  useLayoutEffect(() => {
    if (!session.isPending && !session.data?.user && !isSignOutInitiated()) {
      navigate(`/sign-in?redirect=${encodeURIComponent(location)}`);
    }
  }, [session.data, session.isPending]);

  return session;
}
