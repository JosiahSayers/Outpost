import { authClient } from "$/frontend/utils/auth-client";
import { useLayoutEffect } from "react";
import { useLocation } from "wouter";

// Redirects the user if they have a valid session
export function useUnauthenticatedGuard(redirect = "/") {
  const session = authClient.useSession();
  const [, navigate] = useLocation();

  useLayoutEffect(() => {
    if (session.data?.user) {
      navigate(redirect);
    }
  }, [session.data]);
}
