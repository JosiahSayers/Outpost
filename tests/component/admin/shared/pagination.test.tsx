import AdminPagination from "$/frontend/admin/shared/pagination";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function renderPagination(
  props: Partial<Parameters<typeof AdminPagination>[0]> = {},
) {
  const onPageChange = mock(() => {});
  render(
    <MantineProvider>
      <AdminPagination
        page={1}
        pageSize={10}
        total={35}
        onPageChange={onPageChange}
        {...props}
      />
    </MantineProvider>,
  );
  return onPageChange;
}

describe("when there is only one page of results", () => {
  it("renders nothing", () => {
    render(
      <MantineProvider>
        <AdminPagination
          page={1}
          pageSize={10}
          total={10}
          onPageChange={() => {}}
        />
      </MantineProvider>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders nothing when there are no results", () => {
    render(
      <MantineProvider>
        <AdminPagination
          page={1}
          pageSize={10}
          total={0}
          onPageChange={() => {}}
        />
      </MantineProvider>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("when results span multiple pages", () => {
  it("renders a control for each page", () => {
    renderPagination({ total: 35, pageSize: 10 });

    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "5" })).not.toBeInTheDocument();
  });

  it("calls onPageChange with the selected page", () => {
    const onPageChange = renderPagination({ page: 1, total: 35 });

    fireEvent.click(screen.getByRole("button", { name: "3" }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("marks the current page as active", () => {
    renderPagination({ page: 2, total: 35 });

    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("disables the controls when disabled is passed", () => {
    renderPagination({ page: 1, total: 35, disabled: true });

    expect(screen.getByRole("button", { name: "2" })).toBeDisabled();
  });
});
