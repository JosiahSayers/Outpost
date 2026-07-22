import { Badge } from "@mantine/core";

interface SessionStatusBadgeProps {
  expiresAt: Date | string;
}

export default function SessionStatusBadge({
  expiresAt,
}: SessionStatusBadgeProps) {
  const isActive = new Date(expiresAt).getTime() > Date.now();

  return isActive ? (
    <Badge color="trail-green">Active</Badge>
  ) : (
    <Badge color="stone-gray">Expired</Badge>
  );
}
