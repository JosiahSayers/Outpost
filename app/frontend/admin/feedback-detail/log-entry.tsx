import { formatRelativeTime } from "$/frontend/utils/format-relative-time";
import type { ClientAdminFeedbackAuditLog } from "$/transformers/admin/feedback-audit-log";
import { Text } from "@mantine/core";

interface Props {
  log: ClientAdminFeedbackAuditLog;
}

export default function LogEntry({ log }: Props) {
  return (
    <Text size="xs" c="dimmed" px={4}>
      &bull; {log.changeDescription} &mdash; {log.admin?.name ?? "System"}
      {" · "}
      {formatRelativeTime(new Date(log.createdAt))}
    </Text>
  );
}
