import {
  ACTIONABLE_STATUSES,
  ALL_STATUSES,
  STATUS_LABEL,
} from "$/frontend/admin/feedback/status";
import { Chip, Divider, Group } from "@mantine/core";
import type { FeedbackStatus } from "../../../../generated/prisma/enums";

const TERMINAL_STATUSES = ALL_STATUSES.filter(
  (status) => !ACTIONABLE_STATUSES.includes(status),
);

interface Props {
  value: FeedbackStatus[];
  onChange: (value: FeedbackStatus[]) => void;
}

export default function StatusFilter({ value, onChange }: Props) {
  return (
    <Chip.Group
      multiple
      value={value}
      onChange={(next) => onChange(next as FeedbackStatus[])}
    >
      <Group gap="xs" wrap="wrap">
        {ACTIONABLE_STATUSES.map((status) => (
          <Chip key={status} value={status} size="sm">
            {STATUS_LABEL[status]}
          </Chip>
        ))}
        <Divider orientation="vertical" />
        {TERMINAL_STATUSES.map((status) => (
          <Chip key={status} value={status} size="sm">
            {STATUS_LABEL[status]}
          </Chip>
        ))}
      </Group>
    </Chip.Group>
  );
}
