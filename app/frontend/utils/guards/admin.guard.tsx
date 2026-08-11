import { useResolvedSession } from "$/frontend/utils/guards/use-resolved-session";
import { useLayoutEffect } from "react";
import { useLocation } from "wouter";

export function useAdminGuard() {
  const session = useResolvedSession();
  const [location, navigate] = useLocation();

  useLayoutEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!session.data?.user) {
      navigate(`/sign-in?redirect=${encodeURIComponent(location)}`);
      return;
    }

    if (session.data.user.role !== "admin") {
      navigate("/dashboard");
      return;
    }

    if (
      !session.data.user.twoFactorEnabled ||
      !session.data.user.emailVerified
    ) {
      navigate("/account/security?adminMfaRequired=true");
    }
  }, [session.data, session.isPending]);

  return session;
}
