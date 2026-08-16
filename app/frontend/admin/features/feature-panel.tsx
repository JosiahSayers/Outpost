import UserStatusBadge from "$/frontend/admin/user-search/user-status-badge";
import SearchCombobox from "$/frontend/shared-components/search-combobox";
import {
  useAdminFeatureDetail,
  useEnableFeatureForUser,
  useToggleFeature,
  useUnsetFeatureForUser,
} from "$/frontend/utils/api/admin-features";
import {
  adminUserKeys,
  useAdminUserSearch,
} from "$/frontend/utils/api/admin-users";
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
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
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
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [debouncedUserQuery] = useDebouncedValue(userQuery, 300);
  // Group's `gap` prop is a plain MantineSpacing value, not one of the
  // generic responsive style props, so `gap={{ md: "100px" }}` doesn't work
  // the way `pt={{ base, md }}` below does — drive it from JS instead,
  // matching the theme's `md` breakpoint (64em, see theme.ts).
  const isMdUp = useMediaQuery("(min-width: 64em)");
  const userSearch = useAdminUserSearch(debouncedUserQuery, 0, 5);
  const { data, isPending, isError } = useAdminFeatureDetail(feature, isOpen);
  const toggleFeature = useToggleFeature(feature);
  const enableForUser = useEnableFeatureForUser(feature);
  const unsetForUser = useUnsetFeatureForUser(feature);

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
  const enabledUserIds = new Set(detail.enabledUsers.map((user) => user.id));
  const searchResults = (userSearch.data?.users ?? []).filter(
    (user) => !enabledUserIds.has(user.id),
  );

  function handleAddUser() {
    if (!selectedUserId) return;
    const id = selectedUserId;
    setUserQuery("");
    setSelectedUserId(undefined);
    enableForUser.mutate(id, { onError: notifyError("Couldn't add user") });
  }

  return (
    <Group
      align="flex-start"
      justify="flex-start"
      gap={isMdUp ? "100px" : "lg"}
      wrap="wrap"
      pt={{ base: "md", md: 0 }}
    >
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
            label="Enabled for everyone"
            description="Turns the flag on for 100% of users. Users in the list below get it either way."
          />
        </div>

        <Box>
          <FieldLabel>Add user</FieldLabel>
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <div style={{ flex: 1 }}>
              <SearchCombobox
                placeholder="Search by name or email…"
                aria-label="Search users to add"
                value={userQuery}
                onValueChange={(value) => {
                  setUserQuery(value);
                  setSelectedUserId(undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUser();
                  }
                }}
                results={searchResults}
                isFetching={userSearch.isFetching}
                searchKeyPrefix={adminUserKeys.searchAll}
                getOptionValue={(user) => user.id}
                onOptionSubmit={(user) => {
                  setUserQuery(user.name);
                  setSelectedUserId(user.id);
                }}
                hidden={debouncedUserQuery.trim().length === 0}
                icon={(user) => (
                  <Avatar
                    radius="xl"
                    size={20}
                    color="stone-gray"
                    variant="filled"
                  >
                    {getInitials(user.name)}
                  </Avatar>
                )}
                renderOption={(user) => (
                  <>
                    <Text size="sm" fw={600} lineClamp={1}>
                      {user.name}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {user.email}
                    </Text>
                  </>
                )}
                emptyMessage="No users found"
              />
            </div>
            <Button onClick={handleAddUser} disabled={!selectedUserId}>
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
                      unsetForUser.mutate(user.id, {
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
