import { hostnameOf } from "$/frontend/trip/links/hostname";
import { Card, Skeleton, Stack, Text } from "@mantine/core";

/**
 * Rendered while a link is being created — the URL is known immediately,
 * but the title/description/image come from an Open Graph fetch the server
 * does synchronously, which takes noticeably longer than a normal request.
 */
export default function PendingLinkCard({ url }: { url: string }) {
  return (
    <Card withBorder padding="lg">
      <Card.Section>
        <Skeleton height={160} radius={0} />
      </Card.Section>
      <Stack gap={6} mt="md">
        <Skeleton height={14} width="70%" />
        <Text size="xs" c="dimmed" ff="monospace">
          {hostnameOf(url)}
        </Text>
        <Skeleton height={10} width="90%" />
        <Skeleton height={10} width="55%" />
      </Stack>
    </Card>
  );
}
