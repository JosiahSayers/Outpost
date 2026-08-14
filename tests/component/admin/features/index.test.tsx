import AdminFeatures from "$/frontend/admin/features";
import { adminFeatureKeys } from "$/frontend/utils/api/admin-features";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, mock } from "bun:test";

// Not typed against `Features.featureList()`'s return type -- that type's
// `feature` field is a literal union of the real FEATURES array (currently
// just "trip-file-upload"), which can't express a second, not-yet-real flag.
// Untyped literals stand in for one so list-level behavior (multiple items,
// multiple open panels) can be exercised without waiting on FEATURES to grow.
const TRIP_FILE_UPLOAD = {
  feature: "trip-file-upload",
  name: "Trip File Upload",
  description: "Surfaces the ability for users to upload files to a trip.",
};

const GPX_ROUTE_IMPORT = {
  feature: "gpx-route-import",
  name: "GPX Route Import",
  description:
    "Lets users attach a GPX track to a trip and see it rendered on the trip map.",
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderPage(queryClient: QueryClient = makeQueryClient()) {
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <AdminFeatures />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("with features", () => {
  it("renders every feature's name, slug, and description", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminFeatureKeys.list(), {
      features: [TRIP_FILE_UPLOAD, GPX_ROUTE_IMPORT],
    });
    renderPage(queryClient);

    await waitFor(() => screen.getByText("Trip File Upload"));
    expect(screen.getByText("trip-file-upload")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Surfaces the ability for users to upload files to a trip.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("GPX Route Import")).toBeInTheDocument();
    expect(screen.getByText("gpx-route-import")).toBeInTheDocument();
  });

  it("allows more than one feature's panel to stay open at the same time", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminFeatureKeys.list(), {
      features: [TRIP_FILE_UPLOAD, GPX_ROUTE_IMPORT],
    });
    renderPage(queryClient);
    await waitFor(() => screen.getByText("Trip File Upload"));

    fireEvent.click(screen.getByText("Trip File Upload"));
    fireEvent.click(screen.getByText("GPX Route Import"));

    await waitFor(() => {
      const panels = screen.getAllByText(
        "Status controls for this flag will go here.",
      );
      expect(panels[0]).toBeVisible();
      expect(panels[1]).toBeVisible();
    });
  });
});

describe("with no features", () => {
  it("shows an empty state", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminFeatureKeys.list(), { features: [] });
    renderPage(queryClient);

    await waitFor(() =>
      expect(screen.getByText("No feature flags yet")).toBeInTheDocument(),
    );
  });
});

describe("when the request fails", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("shows an error state", async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response(null, { status: 500 })),
    ) as unknown as typeof fetch;

    renderPage(
      new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Couldn’t load feature flags."),
      ).toBeInTheDocument(),
    );
  });
});
