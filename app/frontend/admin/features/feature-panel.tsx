import UserStatusBadge from "$/frontend/admin/user-search/user-status-badge";
import {
  useAdminFeatureDetail,
  useDisableFeatureForUser,
  useEnableFeatureForUser,
  useToggleFeature,
} from "$/frontend/utils/api/admin-features";
import { getInitials } from "$/frontend/utils/get-initials";
import { notifyError } from "$/frontend/utils/notify-error";
import type { Feature } from "$/utils/features";
import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { XIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface Props {
  feature: Feature;
  isOpen: boolean;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="xs"
      fw={700}
      tt="uppercase"
      c="dimmed"
      mb={6}
      style={{ letterSpacing: "0.04em" }}
    >
      {children}
    </Text>
  );
}

export default function FeaturePanel({ feature, isOpen }: Props) {
  const [userId, setUserId] = useState("");
  const { data, isPending, isError } = useAdminFeatureDetail(feature, isOpen);
  const toggleFeature = useToggleFeature(feature);
  const enableForUser = useEnableFeatureForUser(feature);
  const disableForUser = useDisableFeatureForUser(feature);

  if (!isOpen) {
    return null;
  }

  if (isPending) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }

  if (isError || !data) {
    return (
      <Text size="sm" c="dimmed">
        Couldn&rsquo;t load details for this flag.
      </Text>
    );
  }

  const detail = data.feature;

  function handleAddUser() {
    const id = userId.trim();
    if (!id) return;
    setUserId("");
    enableForUser.mutate(id, { onError: notifyError("Couldn't add user") });
  }

  return (
    <Group align="flex-start" justify="flex-start" gap="100px" wrap="wrap">
      <Stack gap="lg" style={{ flex: "1 1 220px", maxWidth: 360 }}>
        <div>
          <FieldLabel>Status</FieldLabel>
          <Switch
            checked={detail.enabled}
            onChange={(e) =>
              toggleFeature.mutate(e.currentTarget.checked, {
                onError: notifyError("Couldn't update flag"),
              })
            }
            disabled={toggleFeature.isPending}
            label="Enabled for allowed users"
            description="Turns the flag on for users in the list below — not for everyone."
          />
        </div>

        <Box>
          <FieldLabel>Add user</FieldLabel>
          <Group gap="xs" wrap="nowrap">
            <TextInput
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddUser();
                }
              }}
              style={{ flex: 1 }}
            />
            <Button onClick={handleAddUser} disabled={!userId.trim()}>
              Add
            </Button>
          </Group>
        </Box>
      </Stack>

      <Box style={{ flex: "1 1 280px", minWidth: 0, maxWidth: 560 }}>
        <FieldLabel>
          Enabled users &middot; {detail.enabledUsers.length}
        </FieldLabel>
        {detail.enabledUsers.length === 0 ? (
          <Text size="sm" c="dimmed" fs="italic">
            No users enabled yet.
          </Text>
        ) : (
          <Stack gap={6}>
            {detail.enabledUsers.map((user) => (
              <Group
                key={user.id}
                justify="space-between"
                wrap="nowrap"
                gap="xs"
                px="sm"
                py={6}
                style={{
                  background: "var(--mantine-color-default-hover)",
                  borderRadius: "var(--mantine-radius-sm)",
                }}
              >
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Avatar
                    radius="xl"
                    size={28}
                    color="stone-gray"
                    variant="filled"
                  >
                    {getInitials(user.name)}
                  </Avatar>
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {user.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {user.email}
                    </Text>
                  </div>
                </Group>
                <Group gap={6} wrap="nowrap">
                  <UserStatusBadge user={user} />
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    aria-label={`Remove ${user.email}`}
                    onClick={() =>
                      disableForUser.mutate(user.id, {
                        onError: notifyError("Couldn't remove user"),
                      })
                    }
                  >
                    <XIcon size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Box>
    </Group>
  );
}
