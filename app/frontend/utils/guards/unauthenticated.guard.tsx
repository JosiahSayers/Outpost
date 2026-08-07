import { useResolvedSession } from "$/frontend/utils/guards/use-resolved-session";
import { useLayoutEffect } from "react";
import { useLocation } from "wouter";

// Redirects the user if they have a valid session
export function useUnauthenticatedGuard(redirect = "/") {
  const session = useResolvedSession();
  const [, navigate] = useLocation();

  useLayoutEffect(() => {
    if (session.data?.user) {
      navigate(redirect);
    }
  }, [session.data]);
}
