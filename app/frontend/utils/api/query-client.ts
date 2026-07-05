import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Client errors (4xx) won't succeed on retry, e.g. a 404 for a
        // nonexistent trip or a 403 for one the user can't access.
        const status = (error as any)?.status;
        if (typeof status === "number" && status >= 400 && status < 500) {
          return false;
        }

        return failureCount < 3;
      },
    },
  },
});
