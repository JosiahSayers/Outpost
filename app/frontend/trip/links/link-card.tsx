import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import { hostnameOf } from "$/frontend/trip/links/hostname";
import LinkDescriptionField from "$/frontend/trip/links/link-description-field";
import LinkThumb from "$/frontend/trip/links/link-thumb";
import LinkTitleField from "$/frontend/trip/links/link-title-field";
import { useDeleteTripLink } from "$/frontend/utils/api/trip-link";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientTripLink } from "$/transformers/trip-link";
import { ActionIcon, Badge, Card, Group, Stack, Text } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface Props {
  tripId: string;
  link: ClientTripLink;
}

export default function LinkCard({ tripId, link }: Props) {
  const deleteLink = useDeleteTripLink(tripId);
  const [confirmOpened, confirm] = useDisclosure(false);
  const [hovered, setHovered] = useState(false);
  // Touch devices can't hover, so the delete control and "add a title/
  // description" prompts must stay visible unconditionally.
  const isTouchDevice = useMediaQuery("(hover: none)");
  const showControls = hovered || isTouchDevice;
  const hostname = hostnameOf(link.url);
  // With no title or description, the hostname alone is too thin to tell
  // links apart — fall back to the full URL for more context.
  const metaText = link.name || link.description ? hostname : link.url;

  return (
    <Card
      withBorder
      padding="lg"
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Card.Section
        component="a"
        href={link.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${link.name || hostname}`}
        style={{ display: "block", color: "inherit", textDecoration: "none" }}
      >
        <LinkThumb link={link} />
      </Card.Section>

      <ActionIcon
        variant="filled"
        color="red"
        size="sm"
        aria-label="Delete link"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          opacity: showControls ? 1 : 0,
          transition: "opacity 120ms ease",
        }}
        onClick={() => confirm.open()}
      >
        <TrashIcon size={13} />
      </ActionIcon>

      <Stack gap={6} mt="md">
        <LinkTitleField
          tripId={tripId}
          link={link}
          revealEmpty={showControls}
        />
        <Group gap={6}>
          {link.siteName && <Badge>{link.siteName}</Badge>}
          <Text
            size="xs"
            c="dimmed"
            ff="monospace"
            style={{ overflowWrap: "anywhere" }}
          >
            {metaText}
          </Text>
        </Group>
        <LinkDescriptionField
          tripId={tripId}
          link={link}
          revealEmpty={showControls}
        />
      </Stack>

      <ConfirmDeleteModal
        opened={confirmOpened}
        onClose={confirm.close}
        onConfirm={() =>
          deleteLink.mutate(link.id, {
            onError: notifyError("Couldn't delete link"),
          })
        }
        title="Delete link?"
      >
        Remove <strong>{link.name || hostname}</strong> from this trip? This
        can&apos;t be undone.
      </ConfirmDeleteModal>
    </Card>
  );
}
