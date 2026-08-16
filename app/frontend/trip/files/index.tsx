import FileRow from "$/frontend/trip/files/file-row";
import { useUploadTripFile } from "$/frontend/utils/api/trip-file";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientFile } from "$/transformers/file";
import { MAX_FILE_UPLOAD_BYTES } from "$/utils/file-upload";
import { Alert, Group, Stack, Text, Title } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import {
  CloudArrowUpIcon,
  LockSimpleIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";

interface Props {
  tripId: string;
  files: ClientFile[];
  canUpload: boolean;
}

export default function Files({ tripId, files, canUpload }: Props) {
  const uploadFile = useUploadTripFile(tripId);

  function handleDrop(dropped: globalThis.File[]) {
    const file = dropped[0];
    if (!file) return;
    uploadFile.mutate(file, { onError: notifyError("Couldn't upload file") });
  }

  return (
    <Stack gap="sm">
      <Title order={3}>Files</Title>

      {canUpload ? (
        <Dropzone
          onDrop={handleDrop}
          onReject={() =>
            notifyError("Couldn't upload file")(
              new Error("File exceeds the 10MB size limit"),
            )
          }
          maxSize={MAX_FILE_UPLOAD_BYTES}
          multiple={false}
          loading={uploadFile.isPending}
        >
          <Group
            justify="center"
            gap="md"
            mih={96}
            style={{ pointerEvents: "none" }}
          >
            <Dropzone.Accept>
              <UploadSimpleIcon size={22} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <XIcon size={22} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <CloudArrowUpIcon size={22} />
            </Dropzone.Idle>
            <div>
              <Text size="sm" fw={500}>
                Drop a file here, or click to browse
              </Text>
              <Text size="xs" c="dimmed">
                Up to 10 MB
              </Text>
            </div>
          </Group>
        </Dropzone>
      ) : (
        <Alert icon={<LockSimpleIcon size={16} />} color="gray" variant="light">
          Uploads are turned off for your account. You can still download or
          remove files already on this trip.
        </Alert>
      )}

      {files.length > 0 && (
        <Stack gap={0}>
          {files.map((file) => (
            <FileRow key={file.id} tripId={tripId} file={file} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
