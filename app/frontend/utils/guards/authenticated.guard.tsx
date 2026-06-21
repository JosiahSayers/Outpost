import { authClient } from "$/frontend/utils/auth-client";
import { useLayoutEffect } from "react";
import { useLocation } from "wouter";

export function useAuthenticatedGuard() {
  const session = authClient.useSession();
  const [location, navigate] = useLocation();

  useLayoutEffect(() => {
    if (!session.isPending && !session.data?.user) {
      navigate(`/sign-in?redirect=${encodeURIComponent(location)}`);
    }
  }, [session.data, session.isPending]);

  return session;
}
