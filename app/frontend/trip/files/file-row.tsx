import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import { useDeleteTripFile } from "$/frontend/utils/api/trip-file";
import { formatShortDate } from "$/frontend/utils/format-short-date";
import type { ClientFile } from "$/transformers/file";
import { ActionIcon, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  DownloadSimpleIcon,
  FileDocIcon,
  FileIcon,
  FileImageIcon,
  FilePdfIcon,
  FileTextIcon,
  FileXlsIcon,
  FileZipIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { filesize } from "filesize";
import { useState } from "react";

const fileTypeIcons: Record<string, typeof FileIcon> = {
  "application/pdf": FilePdfIcon,
  "application/msword": FileDocIcon,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    FileDocIcon,
  "application/vnd.ms-excel": FileXlsIcon,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    FileXlsIcon,
  "text/csv": FileXlsIcon,
  "text/plain": FileTextIcon,
  "application/zip": FileZipIcon,
};

function iconFor(contentType: string): typeof FileIcon {
  if (contentType.startsWith("image/")) return FileImageIcon;
  return fileTypeIcons[contentType] ?? FileIcon;
}

interface Props {
  tripId: string;
  file: ClientFile;
}

export default function FileRow({ tripId, file }: Props) {
  const deleteFile = useDeleteTripFile(tripId);
  const [confirmOpened, confirm] = useDisclosure(false);
  const [hovered, setHovered] = useState(false);
  // Touch devices can't hover, so the download/delete controls must stay
  // visible unconditionally rather than waiting for a mouseenter that never
  // fires.
  const isTouchDevice = useMediaQuery("(hover: none)");
  const showControls = hovered || isTouchDevice;
  const Icon = iconFor(file.contentType);

  return (
    <>
      <Group
        gap="sm"
        wrap="nowrap"
        py="xs"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <ThemeIcon size={34} radius="sm" variant="light" color="stone-gray">
          <Icon size={17} />
        </ThemeIcon>

        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} truncate="end">
            {file.filename}
          </Text>
          <Text size="xs" c="dimmed">
            {filesize(file.bytes, { standard: "jedec" })} &middot; Uploaded{" "}
            {formatShortDate(file.createdAt)}
          </Text>
        </Stack>

        <Group
          gap={2}
          wrap="nowrap"
          style={{ visibility: showControls ? "visible" : "hidden" }}
        >
          <ActionIcon
            component="a"
            href={`/api/trips/${tripId}/files/${file.id}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="subtle"
            color="gray"
            aria-label={`Download ${file.filename}`}
          >
            <DownloadSimpleIcon size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={`Delete ${file.filename}`}
            onClick={() => confirm.open()}
          >
            <TrashIcon size={16} />
          </ActionIcon>
        </Group>
      </Group>

      <ConfirmDeleteModal
        opened={confirmOpened}
        onClose={confirm.close}
        onConfirm={() => deleteFile.mutate(file.id)}
        title="Delete file?"
      >
        Remove <strong>{file.filename}</strong> from this trip? This can&apos;t
        be undone.
      </ConfirmDeleteModal>
    </>
  );
}
