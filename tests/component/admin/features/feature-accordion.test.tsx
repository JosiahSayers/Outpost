import FeatureAccordion from "$/frontend/admin/features/feature-accordion";
import type { AdminFeatureDetail } from "$/frontend/utils/api/admin-features";
import type { ClientAdminUser } from "$/transformers/admin/user";
import type { Features } from "$/utils/features";
import { Accordion, MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { useState } from "react";

type Feature = ReturnType<typeof Features.featureList>[number];

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    feature: "trip-file-upload",
    name: "Trip File Upload",
    description: "Surfaces the ability for users to upload files to a trip.",
    ...overrides,
  };
}

function makeUser(overrides: Partial<ClientAdminUser> = {}): ClientAdminUser {
  return {
    id: "usr_123",
    banExpires: null,
    banReason: null,
    banned: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    email: "user@example.com",
    emailVerified: true,
    image: null,
    name: "Alex Rivers",
    role: "user",
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeDetail(
  overrides: Partial<AdminFeatureDetail> = {},
): AdminFeatureDetail {
  return {
    meta: {
      name: "Trip File Upload",
      description: "Surfaces the ability for users to upload files to a trip.",
    },
    enabled: false,
    enabledUsers: [],
    disabledUserIds: [],
    ...overrides,
  };
}

function Harness({ feature }: { feature: Feature }) {
  const [open, setOpen] = useState<string[]>([]);
  return (
    <Accordion multiple chevronPosition="right" value={open} onChange={setOpen}>
      <FeatureAccordion
        feature={feature}
        isOpen={open.includes(feature.feature)}
      />
    </Accordion>
  );
}

function renderAccordion(feature: Feature = makeFeature()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Harness feature={feature} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function okResponse() {
  return Promise.resolve(new Response(null, { status: 200 }));
}

const originalFetch = global.fetch;
let fetchMock: ReturnType<
  typeof mock<(url: string, options?: RequestInit) => Promise<Response>>
>;
let detail: AdminFeatureDetail;

afterEach(() => {
  global.fetch = originalFetch;
});

let userSearchResults: ClientAdminUser[];

beforeEach(() => {
  detail = makeDetail();
  userSearchResults = [];
  fetchMock = mock((url: string, options?: RequestInit) => {
    const method = options?.method ?? "GET";
    if (method === "GET" && url.startsWith("/admin/users")) {
      return jsonResponse({
        users: userSearchResults,
        total: userSearchResults.length,
        pageSize: 5,
      });
    }
    if (method === "GET") {
      return jsonResponse({ feature: detail });
    }
    return okResponse();
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

it("renders the feature's name, slug, and description", () => {
  renderAccordion();

  expect(screen.getByText("Trip File Upload")).toBeInTheDocument();
  expect(screen.getByText("trip-file-upload")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Surfaces the ability for users to upload files to a trip.",
    ),
  ).toBeInTheDocument();
});

describe("the panel", () => {
  it("does not fetch details until the item is opened", () => {
    renderAccordion();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches and renders details once opened", async () => {
    renderAccordion();

    fireEvent.click(screen.getByText("Trip File Upload"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/admin/features/trip-file-upload",
        undefined,
      ),
    );
    expect(screen.getByText("Enabled for everyone")).toBeInTheDocument();
    expect(screen.getByText("Add user")).toBeInTheDocument();
  });

  it("removes the panel content again once collapsed", async () => {
    renderAccordion();
    const control = screen.getByText("Trip File Upload");

    fireEvent.click(control);
    await waitFor(() =>
      expect(screen.getByText("Add user")).toBeInTheDocument(),
    );

    fireEvent.click(control);
    await waitFor(() =>
      expect(screen.queryByText("Add user")).not.toBeInTheDocument(),
    );
  });
});

describe("the main toggle", () => {
  it("shows the flag's current enabled state", async () => {
    detail = makeDetail({ enabled: true });
    renderAccordion();
    fireEvent.click(screen.getByText("Trip File Upload"));

    await waitFor(() => expect(screen.getByRole("switch")).toBeChecked());
  });

  it("calls the enable endpoint when switched on", async () => {
    renderAccordion();
    fireEvent.click(screen.getByText("Trip File Upload"));
    await waitFor(() => expect(screen.getByRole("switch")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/admin/features/trip-file-upload/enable",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });
});

describe("adding a user", () => {
  it("calls the enable-for-user endpoint and clears the search once a result is picked", async () => {
    userSearchResults = [
      makeUser({
        id: "usr_123",
        name: "Alex Rivers",
        email: "alex@example.com",
      }),
    ];
    renderAccordion();
    fireEvent.click(screen.getByText("Trip File Upload"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Search by name or email…"),
      ).toBeInTheDocument(),
    );

    const input = screen.getByPlaceholderText(
      "Search by name or email…",
    ) as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "alex" } });

    await waitFor(() => screen.getByText("alex@example.com"));
    fireEvent.click(screen.getByText("alex@example.com"));
    expect(input.value).toBe("Alex Rivers");

    fireEvent.click(screen.getByText("Add"));

    expect(input.value).toBe("");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/admin/features/trip-file-upload/user/usr_123/enable",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("excludes users already on the enabled list from search results", async () => {
    const alreadyEnabled = makeUser({
      id: "usr_123",
      name: "Alex Rivers",
      email: "alex@example.com",
    });
    const notYetEnabled = makeUser({
      id: "usr_456",
      name: "Jordan Lee",
      email: "jordan@example.com",
    });
    userSearchResults = [alreadyEnabled, notYetEnabled];
    detail = makeDetail({ enabledUsers: [alreadyEnabled] });
    renderAccordion();
    fireEvent.click(screen.getByText("Trip File Upload"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Search by name or email…"),
      ).toBeInTheDocument(),
    );

    const input = screen.getByPlaceholderText(
      "Search by name or email…",
    ) as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "e" } });

    await waitFor(() => screen.getByText("jordan@example.com"));

    // Query the option nodes directly rather than through
    // getByRole/toBeInTheDocument: "alex@example.com" also renders (visibly)
    // in the enabled-users list, so a text or accessible-name query would
    // match both places, and the dropdown's `hidden` CSS state is flaky to
    // assert on directly in happy-dom (see happy-dom quirks memory). A raw
    // DOM query scoped to `role="option"` sidesteps both issues and checks
    // exactly what changed here: which users the search results contain.
    const optionEmails = Array.from(
      document.querySelectorAll('[role="option"]'),
    ).map((el) => el.textContent);
    expect(optionEmails).toHaveLength(1);
    expect(optionEmails[0]).toContain("jordan@example.com");

    await waitFor(() => {});
  });

  it("does not show the previous result when refocused after adding a user", async () => {
    userSearchResults = [
      makeUser({
        id: "usr_123",
        name: "Alex Rivers",
        email: "alex@example.com",
      }),
    ];
    renderAccordion();
    fireEvent.click(screen.getByText("Trip File Upload"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Search by name or email…"),
      ).toBeInTheDocument(),
    );

    const input = screen.getByPlaceholderText(
      "Search by name or email…",
    ) as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "alex" } });
    await waitFor(() => screen.getByText("alex@example.com"));
    fireEvent.click(screen.getByText("alex@example.com"));
    fireEvent.click(screen.getByText("Add"));
    await waitFor(() => expect(input.value).toBe(""));

    fireEvent.blur(input);
    fireEvent.focus(input);
    await waitFor(() => {});

    // `queryByText` finds the stale option even though the dropdown is
    // `display: none` (Mantine keeps portal content mounted while hidden),
    // and asserting `.not.toBeInTheDocument()` on that non-null element hangs
    // indefinitely in this happy-dom/jest-dom combination instead of failing
    // fast. `queryByRole` respects the hidden state and correctly excludes
    // it from the accessibility tree, so it's both the correct check (is the
    // stale option showing to the user) and the one that doesn't hang.
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("disables the Add button until a search result is picked", async () => {
    renderAccordion();
    fireEvent.click(screen.getByText("Trip File Upload"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Search by name or email…"),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });
});

describe("the enabled users list", () => {
  it("shows an empty state when no users are enabled", async () => {
    renderAccordion();
    fireEvent.click(screen.getByText("Trip File Upload"));

    await waitFor(() =>
      expect(screen.getByText("No users enabled yet.")).toBeInTheDocument(),
    );
  });

  it("lists enabled users and removes one on click", async () => {
    const first = makeUser({
      id: "usr_123",
      name: "Alex Rivers",
      email: "alex@example.com",
    });
    const second = makeUser({
      id: "usr_456",
      name: "Jordan Lee",
      email: "jordan@example.com",
    });
    detail = makeDetail({ enabledUsers: [first, second] });
    renderAccordion();
    fireEvent.click(screen.getByText("Trip File Upload"));

    await waitFor(() =>
      expect(screen.getByText("Alex Rivers")).toBeInTheDocument(),
    );
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
    expect(screen.getByText("jordan@example.com")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove alex@example.com" }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/admin/features/trip-file-upload/user/usr_123",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });
});
