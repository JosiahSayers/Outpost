import { Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export default function SearchSkeleton() {
  return (
    <Stack gap="xs" p={4} w="100%">
      {[80, 60, 70].map((nameWidth, i) => (
        <Stack gap={6} key={i}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Skeleton height={13} width={`${nameWidth}%`} />
            <Skeleton height={16} width={52} radius={2} />
          </Group>
          <SimpleGrid cols={3} spacing={10}>
            <Skeleton height={26} />
            <Skeleton height={26} />
            <Skeleton height={26} />
          </SimpleGrid>
        </Stack>
      ))}
    </Stack>
  );
}
