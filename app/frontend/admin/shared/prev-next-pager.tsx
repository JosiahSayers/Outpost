import { Button, Group, Text } from "@mantine/core";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";

interface PrevNextPagerProps {
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

// For lists whose count query is too expensive to run alongside the page
// query (the API returns `hasMore` from a take+1 fetch instead of a total),
// so there's no page count to render -- only prev/next.
export default function PrevNextPager({
  page,
  hasMore,
  onPageChange,
  disabled,
}: PrevNextPagerProps) {
  if (page === 1 && !hasMore) {
    return null;
  }

  return (
    <Group justify="space-between" mt="sm">
      <Button
        variant="default"
        size="xs"
        leftSection={<ArrowLeftIcon size={12} />}
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Prev
      </Button>
      <Text size="xs" c="dimmed">
        Page {page}
      </Text>
      <Button
        variant="default"
        size="xs"
        rightSection={<ArrowRightIcon size={12} />}
        disabled={disabled || !hasMore}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </Group>
  );
}
