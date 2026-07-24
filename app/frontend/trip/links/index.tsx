import LinkCard from "$/frontend/trip/links/link-card";
import LinkComposer from "$/frontend/trip/links/link-composer";
import PendingLinkCard from "$/frontend/trip/links/pending-link-card";
import { useCreateTripLink } from "$/frontend/utils/api/trip-link";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientTripLink } from "$/transformers/trip-link";
import { SimpleGrid, Stack, Title } from "@mantine/core";
import { useState } from "react";

interface Props {
  tripId: string;
  links: ClientTripLink[];
}

export default function Links({ tripId, links }: Props) {
  const createLink = useCreateTripLink(tripId);
  // The create request fetches Open Graph data server-side before it
  // resolves, so there's no id to key an optimistic cache entry on yet —
  // the pending card is tracked locally until the request settles.
  const [pending, setPending] = useState<{ id: string; url: string }[]>([]);

  function handleAdd(url: string) {
    const id = crypto.randomUUID();
    setPending((current) => [{ id, url }, ...current]);
    createLink.mutate(
      { url },
      {
        onError: notifyError("Couldn't add link"),
        onSettled: () =>
          setPending((current) => current.filter((p) => p.id !== id)),
      },
    );
  }

  return (
    <Stack gap="sm">
      <Title order={3}>Links</Title>
      <LinkComposer
        existingUrls={links.map((link) => link.url)}
        onSubmit={handleAdd}
      />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {links.map((link) => (
          <LinkCard key={link.id} tripId={tripId} link={link} />
        ))}
        {pending.map((p) => (
          <PendingLinkCard key={p.id} url={p.url} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
