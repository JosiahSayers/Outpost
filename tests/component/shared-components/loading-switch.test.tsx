import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function renderSwitch(props: React.ComponentProps<typeof LoadingSwitch>) {
  return render(
    <MantineProvider>
      <LoadingSwitch {...props} />
    </MantineProvider>,
  );
}

function loader() {
  return document.querySelector(".mantine-Loader-root");
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("while loading", () => {
  it("does not call or render the lazy children", () => {
    const children = mock(() => <div>Loaded content</div>);
    renderSwitch({ loading: true, children });

    expect(children).not.toHaveBeenCalled();
    expect(screen.queryByText("Loaded content")).not.toBeInTheDocument();
  });

  it("shows no fallback until the debounce delay has passed", () => {
    renderSwitch({ loading: true, children: () => <div>Loaded content</div> });

    expect(loader()).not.toBeInTheDocument();
  });

  it("shows the default loader once the debounce delay has passed", async () => {
    renderSwitch({ loading: true, children: () => <div>Loaded content</div> });

    await waitFor(() => {
      expect(loader()).toBeInTheDocument();
    });
  });

  it("shows a custom fallback instead of the default loader", async () => {
    renderSwitch({
      loading: true,
      fallback: <div>Looking for your gear…</div>,
      children: () => <div>Loaded content</div>,
    });

    await waitFor(() => {
      expect(screen.getByText("Looking for your gear…")).toBeInTheDocument();
    });
    expect(loader()).not.toBeInTheDocument();
  });
});

describe("when loading resolves before the debounce delay elapses", () => {
  it("never shows a fallback and renders the content directly", async () => {
    const { rerender } = render(
      <MantineProvider>
        <LoadingSwitch loading={true}>
          {() => <div>Loaded content</div>}
        </LoadingSwitch>
      </MantineProvider>,
    );
    await wait(50);
    expect(loader()).not.toBeInTheDocument();

    rerender(
      <MantineProvider>
        <LoadingSwitch loading={false}>
          {() => <div>Loaded content</div>}
        </LoadingSwitch>
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Loaded content")).toBeInTheDocument();
    });
    expect(loader()).not.toBeInTheDocument();
  });
});

describe("when loading resolves after the fallback has been shown", () => {
  it("replaces the fallback with the rendered children", async () => {
    const { rerender } = render(
      <MantineProvider>
        <LoadingSwitch loading={true}>
          {() => <div>Loaded content</div>}
        </LoadingSwitch>
      </MantineProvider>,
    );
    await waitFor(() => {
      expect(loader()).toBeInTheDocument();
    });

    rerender(
      <MantineProvider>
        <LoadingSwitch loading={false}>
          {() => <div>Loaded content</div>}
        </LoadingSwitch>
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Loaded content")).toBeInTheDocument();
    });
    expect(loader()).not.toBeInTheDocument();
  });
});

describe("while not loading", () => {
  it("calls the lazy children and renders its output", () => {
    // MantineProvider itself re-renders once after mount (color scheme
    // sync), so this only asserts children was called, not an exact count.
    const children = mock(() => <div>Loaded content</div>);
    renderSwitch({ loading: false, children });

    expect(children).toHaveBeenCalled();
    expect(screen.getByText("Loaded content")).toBeInTheDocument();
  });

  it("renders no fallback", () => {
    renderSwitch({ loading: false, children: () => <div>Loaded content</div> });

    expect(loader()).not.toBeInTheDocument();
  });
});
