import {
  STATUS_BADGE_PROPS,
  STATUS_LABEL,
} from "$/frontend/admin/feedback/status";
import { Badge } from "@mantine/core";
import type { FeedbackStatus } from "../../../../generated/prisma/enums";

interface Props {
  status: FeedbackStatus;
}

export default function FeedbackStatusBadge({ status }: Props) {
  return <Badge {...STATUS_BADGE_PROPS[status]}>{STATUS_LABEL[status]}</Badge>;
}
