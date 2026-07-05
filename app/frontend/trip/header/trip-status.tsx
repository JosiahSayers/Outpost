import { STATUS_COLOR, STATUS_LABEL } from "$/frontend/dashboard/trip-card";
import { Badge, Select } from "@mantine/core";
import { useState } from "react";
import type { TripStatus } from "../../../../generated/prisma/enums";

const STATUS_VALUES = Object.keys(STATUS_LABEL) as [
  TripStatus,
  ...TripStatus[],
];
const STATUS_OPTIONS = STATUS_VALUES.map((value) => ({
  value,
  label: STATUS_LABEL[value],
}));

interface Props {
  value: TripStatus;
  onSave: (status: TripStatus) => void;
}

export default function TripStatusBadge({ value, onSave }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Select
        data={STATUS_OPTIONS}
        value={value}
        allowDeselect={false}
        defaultDropdownOpened
        onChange={(next) => {
          if (next && next !== value) onSave(next as TripStatus);
          setEditing(false);
        }}
        onDropdownClose={() => setEditing(false)}
        w={160}
        size="xs"
      />
    );
  }

  return (
    <Badge
      color={STATUS_COLOR[value]}
      onClick={() => setEditing(true)}
      style={{ cursor: "pointer" }}
    >
      {STATUS_LABEL[value]}
    </Badge>
  );
}
