import { authClient } from "$/frontend/utils/auth-client";
import { Alert, Anchor, Badge, Group, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { useSearchParams } from "wouter";

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
  const [searchParams] = useSearchParams();
  const adminEmailVerificationRequired =
    searchParams.get("adminEmailVerificationRequired") === "true";
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

      {adminEmailVerificationRequired && (
        <Alert
          color="trail-dust"
          title="Admin access requires a verified email"
        >
          Verify your email address before you can access the admin console.
        </Alert>
      )}

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
