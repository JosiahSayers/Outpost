import { Group, Pagination as MantinePagination } from "@mantine/core";

interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export default function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  disabled,
}: AdminPaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <Group justify="center" mt="md">
      <MantinePagination
        total={totalPages}
        value={page}
        onChange={onPageChange}
        disabled={disabled}
      />
    </Group>
  );
}
