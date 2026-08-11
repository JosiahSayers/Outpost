import { authClient } from "$/frontend/utils/auth-client";
import { Anchor, Badge, Group, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";

interface ProfilePanelProps {
  name: string;
  email: string;
  emailVerified: boolean;
}

export default function ProfilePanel({
  name,
  email,
  emailVerified,
}: ProfilePanelProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    setSending(true);
    await authClient.sendVerificationEmail({
      email,
      callbackURL: "/account/profile",
    });
    setSending(false);
    setSent(true);
  };

  return (
    <Stack gap="md">
      <Title order={3}>Profile</Title>
      <Stack gap="md">
        <div>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            Name
          </Text>
          <Text>{name}</Text>
        </div>
        <div>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            Email
          </Text>
          <Group gap="xs">
            <Text>{email}</Text>
            <Badge color={emailVerified ? "trail-green" : "trail-dust"}>
              {emailVerified ? "Verified" : "Unverified"}
            </Badge>
          </Group>
          {!emailVerified && (
            <Text size="sm" mt={4}>
              {sent ? (
                "Verification email sent — check your inbox."
              ) : (
                <Anchor
                  component="button"
                  type="button"
                  size="sm"
                  disabled={sending}
                  onClick={handleResend}
                >
                  Resend verification email
                </Anchor>
              )}
            </Text>
          )}
        </div>
      </Stack>
    </Stack>
  );
}
